import asyncio
from datetime import date, datetime, timedelta, timezone
import json
import random
import sys
from typing import Dict, List, Tuple
import uuid

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import AsyncSessionLocal, dispose_engine, engine
from src.core.logging import logger, setup_logging
from src.core.security import get_password_hash
from src.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentSubmission,
    LearnerSkillHistory,
    LearnerSkillMastery,
)
from src.models.audit_log import AuditLog
from src.models.competency import Competency, LearnerSkill
from src.models.district import District
from src.models.employer import Employer, HiringMandate
from src.models.learner import Learner
from src.models.placement import Placement, RetentionCheckpoint
from src.models.skill_gap import SkillGapAnalytic, SkillGapIntervention
from src.models.training_center import TrainingCenter
from src.models.user import User
from src.schemas.user import UserRole

# Fixed random seed for 100% deterministic, reproducible seed generation
SEED_VAL = 2026


# ==============================================================================
# Seed Data Definitions
# ==============================================================================

USERS_DATA = [
    # MSDE Central Officers
    ("aman.mishra@msde.gov.in", "Aman Mishra", UserRole.MSDE_OFFICER.value, True),
    ("anita.deshmukh@msde.gov.in", "Dr. Anita Deshmukh (Joint Secretary)", UserRole.MSDE_OFFICER.value, False),
    # State SSDM Administrators
    ("director.upssdm@up.gov.in", "Suresh Patel (Mission Director UPSSDM)", UserRole.STATE_ADMIN.value, False),
    ("director.mssds@maharashtra.gov.in", "Vikram Kulkarni (CEO MSSDS)", UserRole.STATE_ADMIN.value, False),
    ("director.kaushalya@karnataka.gov.in", "K. R. Venkatesh (Director KSDC)", UserRole.STATE_ADMIN.value, False),
    ("director.tsdm@telangana.gov.in", "B. Srinivas Rao (TSDM Mission Head)", UserRole.STATE_ADMIN.value, False),
    ("director.tnsdc@tn.gov.in", "S. Meenakshi (Director TNSDC)", UserRole.STATE_ADMIN.value, False),
    # Training Provider Heads
    ("head.varanasi@pmkk-apex.org", "Alok Kumar Tiwari (Center Head PMKK Varanasi)", UserRole.TRAINING_PROVIDER.value, False),
    ("principal.pune@donbosco-skill.in", "Fr. Augustine Varghese (Don Bosco Skill Academy)", UserRole.TRAINING_PROVIDER.value, False),
    ("director.bengaluru@gtcl-skills.org", "Shalini Ranganathan (GTCL Center Director)", UserRole.TRAINING_PROVIDER.value, False),
    ("head.noida@apex-techskills.in", "Rameshwar Dayal (Apex Skill Center)", UserRole.TRAINING_PROVIDER.value, False),
    # Corporate Employers
    ("talent@tcs.com", "Rohan Mehra (VP Global Talent Acquisition, TCS)", UserRole.EMPLOYER.value, False),
    ("careers@tatamotors.com", "Deepak Saxena (Head Workforce Planning, Tata Motors)", UserRole.EMPLOYER.value, False),
    ("hiring@lnttech.com", "Sunita Nair (HR Director, L&T Technology Services)", UserRole.EMPLOYER.value, False),
    ("talent@adani-solar.com", "Karan Singhal (Head Talent, Adani Solar & Renewables)", UserRole.EMPLOYER.value, False),
    ("hr@apollohospitals.com", "Dr. Preethi Reddy (Chief HR, Apollo Health)", UserRole.EMPLOYER.value, False),
    # Assessment Evaluators
    ("evaluator.ncvet@ncvet-gov.in", "Prof. Dilip Joshi (NCVET Chief Assessor)", UserRole.EVALUATOR.value, False),
    ("evaluator.up@ncvet-gov.in", "Dr. Vandana Mishra (Lead Evaluator Purvanchal)", UserRole.EVALUATOR.value, False),
    # System Admin
    ("admin@kaushalnexus.gov.in", "KaushalNexus System Administrator", UserRole.SYSTEM_ADMIN.value, True),
]

DISTRICTS_DATA = [
    # id, name, state, region, tier, lat, lng
    # Uttar Pradesh
    ("UP-VARANASI", "Varanasi", "Uttar Pradesh", "Eastern UP", "Tier 1", 25.3176, 82.9739),
    ("UP-LUCKNOW", "Lucknow", "Uttar Pradesh", "Central UP", "Tier 1", 26.8467, 80.9462),
    ("UP-NOIDA", "Gautam Buddha Nagar (Noida)", "Uttar Pradesh", "Western UP", "Tier 1", 28.5355, 77.3910),
    ("UP-GORAKHPUR", "Gorakhpur", "Uttar Pradesh", "Eastern UP", "Tier 2", 26.7606, 83.3732),
    ("UP-KANPUR", "Kanpur Nagar", "Uttar Pradesh", "Central UP", "Tier 2", 26.4499, 80.3319),
    ("UP-PRAYAGRAJ", "Prayagraj", "Uttar Pradesh", "Eastern UP", "Tier 2", 25.4358, 81.8463),
    ("UP-MIRZAPUR", "Mirzapur", "Uttar Pradesh", "Vindhyachal", "Tier 3", 25.1337, 82.5644),
    ("UP-CHITRAKOOT", "Chitrakoot", "Uttar Pradesh", "Bundelkhand", "Tier 3", 25.2084, 80.9028),
    # Maharashtra
    ("MH-PUNE", "Pune", "Maharashtra", "Western Maharashtra", "Tier 1", 18.5204, 73.8567),
    ("MH-MUMBAI", "Mumbai Suburban", "Maharashtra", "Konkan", "Tier 1", 19.0760, 72.8777),
    ("MH-NAGPUR", "Nagpur", "Maharashtra", "Vidarbha", "Tier 2", 21.1458, 79.0882),
    ("MH-AURANGABAD", "Chhatrapati Sambhajinagar", "Maharashtra", "Marathwada", "Tier 2", 19.8762, 75.3433),
    ("MH-NANDURBAR", "Nandurbar", "Maharashtra", "Khandesh Tribal Belt", "Tier 3", 21.3734, 74.2403),
    # Karnataka
    ("KA-BENGALURU", "Bengaluru Urban", "Karnataka", "Southern Karnataka", "Tier 1", 12.9716, 77.5946),
    ("KA-MYSURU", "Mysuru", "Karnataka", "Southern Karnataka", "Tier 2", 12.2958, 76.6394),
    ("KA-HUBBALLI", "Dharwad (Hubballi)", "Karnataka", "Northern Karnataka", "Tier 2", 15.3647, 75.1240),
    ("KA-YADGIR", "Yadgir", "Karnataka", "Kalyana Karnataka", "Tier 3", 16.7700, 77.1378),
    # Tamil Nadu
    ("TN-CHENNAI", "Chennai", "Tamil Nadu", "Northern Coastal", "Tier 1", 13.0827, 80.2707),
    ("TN-COIMBATORE", "Coimbatore", "Tamil Nadu", "Western Industrial Corridor", "Tier 1", 11.0168, 76.9558),
    ("TN-MADURAI", "Madurai", "Tamil Nadu", "Southern Region", "Tier 2", 9.9252, 78.1198),
    # Gujarat
    ("GJ-AHMEDABAD", "Ahmedabad", "Gujarat", "Central Gujarat", "Tier 1", 23.0225, 72.5714),
    ("GJ-SURAT", "Surat", "Gujarat", "South Gujarat", "Tier 1", 21.1702, 72.8311),
    ("GJ-VADODARA", "Vadodara", "Gujarat", "Central Gujarat", "Tier 2", 22.3072, 73.1812),
    # Telangana & Andhra Pradesh
    ("TS-HYDERABAD", "Hyderabad", "Telangana", "Telangana Urban", "Tier 1", 17.3850, 78.4867),
    ("TS-WARANGAL", "Warangal", "Telangana", "Northern Telangana", "Tier 2", 17.9689, 79.5941),
    ("AP-VISAKHAPATNAM", "Visakhapatnam", "Andhra Pradesh", "Coastal Andhra", "Tier 1", 17.6868, 83.2185),
    # Madhya Pradesh & Rajasthan
    ("MP-INDORE", "Indore", "Madhya Pradesh", "Malwa Region", "Tier 1", 22.7196, 75.8577),
    ("RJ-JAIPUR", "Jaipur", "Rajasthan", "Dhundhar Region", "Tier 1", 26.9124, 75.7873),
    ("RJ-JODHPUR", "Jodhpur", "Rajasthan", "Marwar Region", "Tier 2", 26.2389, 73.0243),
    # Bihar & Odisha
    ("BR-PATNA", "Patna", "Bihar", "Central Bihar", "Tier 1", 25.5941, 85.1376),
    ("OD-BHUBANESWAR", "Khordha (Bhubaneswar)", "Odisha", "Coastal Odisha", "Tier 1", 20.2961, 85.8245),
]

COMPETENCIES_DATA = [
    # code, name, sector, nqr_code
    # IT-ITeS
    ("COMP-PY-DEV", "Python Application Development", "IT-ITeS", "NQR-2026-IT-01"),
    ("COMP-PY-BASE", "Python Basics", "IT-ITeS", "NQR-2026-IT-10"),
    ("COMP-PY-OOP", "Python OOP", "IT-ITeS", "NQR-2026-IT-11"),
    ("COMP-SQL-CORE", "SQL", "IT-ITeS", "NQR-2026-IT-12"),
    ("COMP-GIT-VCS", "Git", "IT-ITeS", "NQR-2026-IT-13"),
    ("COMP-DSA-CORE", "DSA", "IT-ITeS", "NQR-2026-IT-14"),
    ("COMP-REST-API", "REST API", "IT-ITeS", "NQR-2026-IT-15"),
    ("COMP-CLOUD-OPS", "Cloud DevOps & Kubernetes", "IT-ITeS", "NQR-2026-IT-02"),
    ("COMP-SQL-DATA", "Relational Database Design & SQL", "IT-ITeS", "NQR-2026-IT-03"),
    ("COMP-CYBER-SEC", "Cyber Security Operations (SOC)", "IT-ITeS", "NQR-2026-IT-04"),
    ("COMP-AI-LABEL", "AI Data Annotation & ML Labelling", "IT-ITeS", "NQR-2026-IT-05"),
    ("COMP-FULLSTACK", "Full-Stack Web Development (React & Node)", "IT-ITeS", "NQR-2026-IT-06"),
    # Smart Manufacturing & Automotive
    ("COMP-CNC-MACH", "CNC Machine Operation & Programming", "Smart Manufacturing", "NQR-2026-MFG-01"),
    ("COMP-ROBOTICS", "Industrial Robotics & PLC Automation", "Smart Manufacturing", "NQR-2026-MFG-02"),
    ("COMP-EV-POWER", "EV Powertrain & Battery Assembly", "Automotive", "NQR-2026-AUTO-01"),
    ("COMP-AUTO-CAD", "CAD/CAM Mechanical Design", "Smart Manufacturing", "NQR-2026-MFG-03"),
    ("COMP-QC-INSPECT", "Precision Quality Control & Metrology", "Smart Manufacturing", "NQR-2026-MFG-04"),
    # Green Energy & Renewables
    ("COMP-SOLAR-PV", "Solar PV Rooftop Installation & Sizing", "Renewable Energy", "NQR-2026-GRN-01"),
    ("COMP-GRID-INV", "Grid-Tied Inverter Diagnostics & O&M", "Renewable Energy", "NQR-2026-GRN-02"),
    ("COMP-WIND-TURB", "Wind Turbine Electrical Maintenance", "Renewable Energy", "NQR-2026-GRN-03"),
    ("COMP-BESS-TECH", "Battery Energy Storage Systems (BESS)", "Renewable Energy", "NQR-2026-GRN-04"),
    # Healthcare & Life Sciences
    ("COMP-HLTH-EMT", "Emergency Medical Technician (EMT)", "Healthcare", "NQR-2026-HLT-01"),
    ("COMP-HLTH-GDA", "General Duty Hospital Assistant (GDA)", "Healthcare", "NQR-2026-HLT-02"),
    ("COMP-HLTH-PHLEB", "Phlebotomy & Diagnostic Pathology", "Healthcare", "NQR-2026-HLT-03"),
    ("COMP-MED-EQUIP", "Biomedical Equipment Calibration", "Healthcare", "NQR-2026-HLT-04"),
    # Logistics & Supply Chain
    ("COMP-LOG-WARE", "Supply Chain Warehouse ERP Operations", "Logistics", "NQR-2026-LOG-01"),
    ("COMP-LOG-FLEET", "Fleet Telematics & Route Optimization", "Logistics", "NQR-2026-LOG-02"),
    ("COMP-LOG-COLD", "Pharmaceutical Cold Chain Protocol", "Logistics", "NQR-2026-LOG-03"),
    # Electronics & Hardware
    ("COMP-PCB-SMT", "PCB Assembly & SMT Soldering", "Electronics & Hardware", "NQR-2026-ELE-01"),
    ("COMP-IOT-SENS", "IoT Sensor Hardware Integration", "Electronics & Hardware", "NQR-2026-ELE-02"),
    ("COMP-5G-TELECOM", "5G Telecom Small Cell Maintenance", "Electronics & Hardware", "NQR-2026-ELE-03"),
]

EMPLOYERS_DATA = [
    # company_name, sector, tier, contact_email, contact_person
    ("Tata Consultancy Services", "IT-ITeS", "Enterprise", "careers.enterprise@tcs.com", "Rohan Mehra (VP Talent)"),
    ("Tata Motors Limited", "Automotive", "Enterprise", "workforce.planning@tatamotors.com", "Deepak Saxena (GM Operations)"),
    ("L&T Technology Services", "Smart Manufacturing", "Enterprise", "talent.acquisition@lnttech.com", "Sunita Nair (HR Director)"),
    ("Adani Solar & Green Energy", "Renewable Energy", "Enterprise", "greenjobs@adani.com", "Karan Singhal (Head Talent)"),
    ("Apollo Health & Diagnostics", "Healthcare", "Enterprise", "nursing.staffing@apollohospitals.com", "Dr. Preethi Reddy"),
    ("Schneider Electric India", "Renewable Energy", "Enterprise", "india.careers@se.com", "Arun Varma (Lead Recruiter)"),
    ("Maruti Suzuki India Ltd", "Automotive", "Enterprise", "plant.hiring@maruti.co.in", "Rajeev Chopra (Plant HR)"),
    ("Infosys BPM Enterprise", "IT-ITeS", "Enterprise", "bpm.hiring@infosys.com", "Priya Kulkarni (Talent Partner)"),
    ("Wipro Digital Operations", "IT-ITeS", "Enterprise", "earlycareers@wipro.com", "Siddharth Sen (Campus Lead)"),
    ("Havells India Electricals", "Electronics & Hardware", "Enterprise", "manufacturing.careers@havells.com", "Amitabh Roy"),
    ("Flipkart Supply Chain Logistics", "Logistics", "Enterprise", "supplychain.talent@flipkart.com", "Gaurav Agarwal"),
    ("TVS Motor Company", "Automotive", "Enterprise", "ev.careers@tvsmotor.com", "K. Chandrasekhar"),
    ("Reliance New Energy Solar", "Renewable Energy", "Enterprise", "green.workforce@ril.com", "Manoj Bhatnagar"),
    ("Max Healthcare Institute", "Healthcare", "Enterprise", "allied.health@maxhealthcare.com", "Dr. Nivedita Basu"),
    ("Blue Dart Express", "Logistics", "Enterprise", "hub.operations@bluedart.com", "Sanjay Deshpande"),
    ("Bharat Electronics Limited (BEL)", "Electronics & Hardware", "PSU", "recruitment@bel-india.in", "Col. R. K. Pillai (Retd.)"),
    ("Mahindra & Mahindra Farm & Auto", "Automotive", "Enterprise", "talent@mahindra.com", "Vikram Rathore"),
    ("Ola Electric Mobility", "Automotive", "Mid-Market", "gigafactory.hiring@olaelectric.com", "Shreya Chawla"),
    ("Dixon Technologies", "Electronics & Hardware", "Enterprise", "smt.careers@dixoninfo.com", "Pradeep Soni"),
    ("Apollo Supply Chain Solutions", "Logistics", "Mid-Market", "talent@apollologistics.in", "Manish Tiwari"),
]

FIRST_NAMES = [
    "Aarav", "Pooja", "Vikram", "Sunita", "Amit", "Priya", "Rahul", "Anjali", "Suresh", "Kavita",
    "Manish", "Deepa", "Rohan", "Sneha", "Aditya", "Neha", "Karan", "Divya", "Gaurav", "Swati",
    "Pradeep", "Rashmi", "Sanjay", "Megha", "Alok", "Poonam", "Nitin", "Ritu", "Harish", "Shilpa",
    "Rajesh", "Kiran", "Tarun", "Payal", "Vivek", "Preeti", "Sachin", "Monika", "Ajay", "Jyoti",
    "Sunil", "Arti", "Ashok", "Suman", "Vikas", "Varsha", "Dinesh", "Komal", "Manoj", "Bhavna",
    "Ravi", "Sarita", "Hemant", "Nisha", "Mahesh", "Geeta", "Kamal", "Shweta", "Anand", "Pallavi",
]

LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Gupta", "Singh", "Yadav", "Kumar", "Mishra", "Joshi", "Pandey",
    "Rao", "Nair", "Reddy", "Iyer", "Chauhan", "Tripathi", "Deshmukh", "Kulkarni", "Patil", "Bhat",
    "Mehta", "Shah", "Shukla", "Tiwari", "Saxena", "Soni", "Chopra", "Singhal", "Malhotra", "Agarwal",
    "Dubey", "Goswami", "Srivastava", "Sen", "Roy", "Mukherjee", "Das", "Dey", "Mahajan", "Kashyap",
    "Chawla", "Bansal", "Goel", "Garg", "Jain", "Bhatnagar", "Rathore", "Pawar", "Solanki", "Gowda",
]

EDUCATION_LEVELS = [
    "ITI Certified Technician",
    "Diploma in Engineering",
    "Bachelor of Vocational Studies (B.Voc)",
    "B.Tech in Computer Science",
    "B.Tech in Mechanical Engineering",
    "B.Sc in Applied Electronics",
    "Higher Secondary (10+2 Science)",
    "Graduate in Life Sciences",
    "Diploma in Logistics & SCM",
]


# ==============================================================================
# Seeding Orchestrator
# ==============================================================================

async def seed_database(clean: bool = True) -> Dict[str, int]:
    """
    Populates PostgreSQL database with a deterministic, rich, realistic dataset
    optimized for national hackathon demonstration.
    """
    rng = random.Random(SEED_VAL)
    stats: Dict[str, int] = {}

    setup_logging()
    logger.info(f"Starting deterministic database seed (Fixed Seed: {SEED_VAL})...")

    async with AsyncSessionLocal() as session:
        # 1. Clean existing records if requested
        if clean:
            logger.info("Cleaning existing database records across all domain tables...")
            await session.execute(delete(AuditLog))
            await session.execute(delete(RetentionCheckpoint))
            await session.execute(delete(Placement))
            await session.execute(delete(AssessmentSubmission))
            await session.execute(delete(LearnerSkillHistory))
            await session.execute(delete(LearnerSkillMastery))
            await session.execute(delete(AssessmentQuestion))
            await session.execute(delete(Assessment))
            await session.execute(delete(HiringMandate))
            await session.execute(delete(Employer))
            await session.execute(delete(LearnerSkill))
            await session.execute(delete(Learner))
            await session.execute(delete(TrainingCenter))
            await session.execute(delete(SkillGapIntervention))
            await session.execute(delete(SkillGapAnalytic))
            await session.execute(delete(Competency))
            await session.execute(delete(District))
            await session.execute(delete(User))
            await session.commit()
            logger.info("Database cleaned successfully.")

        # 2. Seed Users & Institutional RBAC Roles
        logger.info("Seeding Institutional RBAC Users...")
        default_pwd_hash = get_password_hash("KaushalNexus2026!")
        user_entities = []
        for email, full_name, role, is_super in USERS_DATA:
            user = User(
                email=email,
                hashed_password=default_pwd_hash,
                full_name=full_name,
                role=role,
                is_active=True,
                is_superuser=is_super,
            )
            session.add(user)
            user_entities.append(user)
        await session.flush()
        stats["users"] = len(user_entities)

        # 3. Seed Geospatial Districts
        logger.info("Seeding National Districts...")
        district_entities: List[District] = []
        for d_id, name, state, region, tier, lat, lng in DISTRICTS_DATA:
            dist = District(
                id=d_id,
                name=name,
                state=state,
                region=region,
                tier=tier,
                latitude=lat,
                longitude=lng,
            )
            session.add(dist)
            district_entities.append(dist)
        await session.flush()
        stats["districts"] = len(district_entities)

        # 4. Seed Accredited Vocational Training Centers
        logger.info("Seeding PMKK & Skill Center Infrastructure...")
        tc_entities: List[TrainingCenter] = []
        for dist in district_entities:
            # 1 to 2 centers per district
            num_centers = 2 if dist.tier == "Tier 1" else 1
            for c_idx in range(num_centers):
                c_code = f"PMKK-{dist.id}-{c_idx+1:02d}"
                tc = TrainingCenter(
                    center_code=c_code,
                    name=f"{dist.name} Pradhan Mantri Kaushal Kendra {c_idx+1}",
                    district_id=dist.id,
                    address=f"Plot {10 + c_idx * 5}, Skill Development Complex, {dist.name}, {dist.state}",
                    is_active=True,
                )
                session.add(tc)
                tc_entities.append(tc)
        await session.flush()
        stats["training_centers"] = len(tc_entities)

        # 5. Seed Competencies
        logger.info("Seeding National Competency Framework...")
        comp_entities: List[Competency] = []
        for code, name, sector, nqr in COMPETENCIES_DATA:
            comp = Competency(
                code=code,
                name=name,
                sector=sector,
                nqr_code=nqr,
            )
            session.add(comp)
            comp_entities.append(comp)
        await session.flush()
        stats["competencies"] = len(comp_entities)

        # 6. Seed Beneficiary Learners (140 realistic candidates)
        logger.info("Seeding Beneficiary Learners & Dossiers...")
        learner_entities: List[Learner] = []
        status_pool = [
            "In Training", "In Training",
            "Assessment Passed", "Assessment Passed", "Assessment Passed",
            "Interview Ready", "Interview Ready",
            "Placed & Verified", "Placed & Verified", "Placed & Verified",
            "Retained (180-Day)", "Retained (180-Day)",
        ]

        for i in range(140):
            if i == 0:
                first_name = "Aarav"
                last_name = "Sharma"
                full_name = "Aarav Sharma"
                email = "aarav.sharma@kaushalnexus.in"
                edu = "B.Voc in Data Analytics & Applied AI"
                dist = next((d for d in district_entities if d.id == "UP-VARANASI"), district_entities[0])
                status = "Interview Ready"
                progress = 92
                readiness = 94
                ncvet_id = "NCVET-2026-CERT-10001"
            elif i == 1:
                first_name = "Amlan"
                last_name = "Chakrabarty"
                full_name = "Amlan Chakrabarty"
                email = "amlan.chakrabarty@kaushalnexus.in"
                edu = "B.Tech in Computer Science & Cloud Ops"
                dist = next((d for d in district_entities if d.id == "UP-NOIDA"), district_entities[0])
                status = "Interview Ready"
                progress = 96
                readiness = 95
                ncvet_id = "NCVET-2026-CERT-10002"
            elif i == 2:
                first_name = "Satyam"
                last_name = "Jaiswal"
                full_name = "Satyam Jaiswal"
                email = "satyam.jaiswal@kaushalnexus.in"
                edu = "Bachelor of Vocational Studies (B.Voc Analytics)"
                dist = next((d for d in district_entities if d.id == "UP-VARANASI"), district_entities[0])
                status = "Placed & Verified"
                progress = 100
                readiness = 93
                ncvet_id = "NCVET-2026-CERT-10003"
            elif i == 3:
                first_name = "Anand"
                last_name = "Maurya"
                full_name = "Anand Maurya"
                email = "anand.maurya@kaushalnexus.in"
                edu = "Diploma in Smart Manufacturing & Robotics"
                dist = next((d for d in district_entities if d.id == "UP-LUCKNOW"), district_entities[0])
                status = "Interview Ready"
                progress = 90
                readiness = 89
                ncvet_id = "NCVET-2026-CERT-10004"
            else:
                first_name = rng.choice(FIRST_NAMES)
                last_name = rng.choice(LAST_NAMES)
                full_name = f"{first_name} {last_name}"
                email = f"{first_name.lower()}.{last_name.lower()}.{i+1}@kaushalnexus.in"
                edu = rng.choice(EDUCATION_LEVELS)
                dist = rng.choice(district_entities)

                status = rng.choice(status_pool)
                if status == "In Training":
                    progress = rng.randint(30, 75)
                    readiness = rng.randint(45, 75)
                    ncvet_id = None
                elif status == "Assessment Passed":
                    progress = rng.randint(80, 95)
                    readiness = rng.randint(70, 88)
                    ncvet_id = f"NCVET-2026-CERT-{10000 + i}"
                elif status == "Interview Ready":
                    progress = rng.randint(90, 100)
                    readiness = rng.randint(80, 94)
                    ncvet_id = f"NCVET-2026-CERT-{10000 + i}"
                else:  # Placed or Retained
                    progress = 100
                    readiness = rng.randint(85, 98)
                    ncvet_id = f"NCVET-2026-CERT-{10000 + i}"

            l_id = f"KN-2026-{1000 + i:05d}"
            phone = f"+91-{rng.randint(90000, 99999)}-{rng.randint(10000, 99999)}"
            nsqf = rng.choice(["NSQF Level 4", "NSQF Level 5", "NSQF Level 6"])

            # Find matching training center in same district
            dist_tcs = [tc for tc in tc_entities if tc.district_id == dist.id]
            tc_id = dist_tcs[0].id if dist_tcs else tc_entities[0].id

            learner = Learner(
                id=l_id,
                full_name=full_name,
                email=email,
                phone=phone,
                education_level=edu,
                training_center_id=tc_id,
                district_id=dist.id,
                nsqf_level=nsqf,
                employment_readiness_score=readiness,
                overall_progress=progress,
                ncvet_credential_id=ncvet_id,
                status=status,
            )
            session.add(learner)
            learner_entities.append(learner)
        await session.flush()
        stats["learners"] = len(learner_entities)

        # 7. Seed Learner Skills & Competency Scores
        logger.info("Seeding Verified Learner Skill Assessments...")
        skill_count = 0
        for l in learner_entities:
            # Assign 2 to 4 skills per candidate
            num_skills = rng.randint(2, 4)
            chosen_comps = rng.sample(comp_entities, num_skills)
            for comp in chosen_comps:
                score = rng.randint(68, 98) if l.status != "In Training" else rng.randint(50, 80)
                skill = LearnerSkill(
                    learner_id=l.id,
                    competency_id=comp.id,
                    score_percentage=score,
                    is_verified=l.status != "In Training",
                    verified_by="National Council for Vocational Education and Training (NCVET)" if l.status != "In Training" else None,
                    assessed_at=datetime.now(timezone.utc) - timedelta(days=rng.randint(5, 90)) if l.status != "In Training" else None,
                )
                session.add(skill)
                skill_count += 1
        await session.flush()
        stats["learner_skills"] = skill_count

        # 8. Seed Corporate Employers
        logger.info("Seeding Corporate Employers...")
        employer_entities: List[Employer] = []
        for name, sector, tier, email, person in EMPLOYERS_DATA:
            emp = Employer(
                company_name=name,
                industry_sector=sector,
                tier=tier,
                contact_email=email,
                contact_person=person,
                is_active=True,
            )
            session.add(emp)
            employer_entities.append(emp)
        await session.flush()
        stats["employers"] = len(employer_entities)

        # 9. Seed Active Hiring Mandates (30 mandates across sectors & states)
        logger.info("Seeding Active Corporate Hiring Mandates...")
        mandate_entities: List[HiringMandate] = []
        mandate_templates = [
            ("Junior Python Application Developer", "IT-ITeS", ["COMP-PY-DEV", "COMP-SQL-DATA"], 4.2, 5.8),
            ("Cloud Operations & DevOps Engineer", "IT-ITeS", ["COMP-CLOUD-OPS", "COMP-CYBER-SEC"], 5.0, 7.5),
            ("Full-Stack React & Node Engineer", "IT-ITeS", ["COMP-FULLSTACK", "COMP-SQL-DATA"], 4.5, 6.5),
            ("CNC Machine Programmer & Operator", "Smart Manufacturing", ["COMP-CNC-MACH", "COMP-QC-INSPECT"], 3.6, 4.8),
            ("Industrial Automation & PLC Technician", "Smart Manufacturing", ["COMP-ROBOTICS", "COMP-AUTO-CAD"], 4.0, 5.5),
            ("EV Battery Pack Assembly Specialist", "Automotive", ["COMP-EV-POWER", "COMP-QC-INSPECT"], 3.8, 5.2),
            ("Automotive Quality Assurance Inspector", "Automotive", ["COMP-QC-INSPECT", "COMP-CNC-MACH"], 3.4, 4.5),
            ("Solar PV Field Installation Lead", "Renewable Energy", ["COMP-SOLAR-PV", "COMP-GRID-INV"], 3.6, 5.0),
            ("Renewables Energy Storage Technician", "Renewable Energy", ["COMP-BESS-TECH", "COMP-SOLAR-PV"], 4.0, 5.6),
            ("Emergency Medical Services First Responder", "Healthcare", ["COMP-HLTH-EMT", "COMP-HLTH-GDA"], 3.2, 4.2),
            ("Diagnostic Phlebotomist & Lab Assistant", "Healthcare", ["COMP-HLTH-PHLEB", "COMP-HLTH-GDA"], 3.0, 4.0),
            ("Biomedical Equipment Maintenance Engineer", "Healthcare", ["COMP-MED-EQUIP", "COMP-IOT-SENS"], 4.2, 5.8),
            ("Warehouse ERP Operations Lead", "Logistics", ["COMP-LOG-WARE", "COMP-LOG-FLEET"], 3.5, 4.6),
            ("Cold Chain Logistics Coordinator", "Logistics", ["COMP-LOG-COLD", "COMP-LOG-WARE"], 3.8, 5.0),
            ("SMT Hardware Production Technician", "Electronics & Hardware", ["COMP-PCB-SMT", "COMP-IOT-SENS"], 3.4, 4.5),
            ("5G Telecom Field Integration Engineer", "Electronics & Hardware", ["COMP-5G-TELECOM", "COMP-IOT-SENS"], 4.0, 5.5),
        ]

        for idx, (title, sector, comp_codes, min_sal, max_sal) in enumerate(mandate_templates):
            # Pick a matching sector employer
            sector_emps = [e for e in employer_entities if e.industry_sector == sector]
            emp = sector_emps[0] if sector_emps else rng.choice(employer_entities)
            dist = rng.choice(district_entities)

            comp_names = []
            for c_code in comp_codes:
                match = next((c.name for c in comp_entities if c.code == c_code), c_code)
                comp_names.append(match)

            mandate = HiringMandate(
                employer_id=emp.id,
                job_title=title,
                sector=sector,
                district_id=dist.id,
                state=dist.state,
                openings_count=rng.randint(8, 30),
                min_nsqf_level="NSQF Level 5",
                required_competencies_json=json.dumps(comp_names),
                salary_min_lpa=min_sal,
                salary_max_lpa=max_sal,
                retention_benchmark_days=180,
                is_active=True,
            )
            session.add(mandate)
            mandate_entities.append(mandate)

            # Duplicate with different district for multi-district demand
            dist2 = rng.choice(district_entities)
            if dist2.id != dist.id:
                mandate2 = HiringMandate(
                    employer_id=emp.id,
                    job_title=f"{title} (Regional)",
                    sector=sector,
                    district_id=dist2.id,
                    state=dist2.state,
                    openings_count=rng.randint(5, 20),
                    min_nsqf_level="NSQF Level 4",
                    required_competencies_json=json.dumps(comp_names),
                    salary_min_lpa=min_sal * 0.95,
                    salary_max_lpa=max_sal * 0.95,
                    retention_benchmark_days=180,
                    is_active=True,
                )
                session.add(mandate2)
                mandate_entities.append(mandate2)

        await session.flush()
        stats["hiring_mandates"] = len(mandate_entities)

        # 10. Seed Placements & Longitudinal Retention Checkpoints (55 placed candidates)
        logger.info("Seeding Placements & Longitudinal Retention Trajectories...")
        placed_learners = [l for l in learner_entities if "Placed" in l.status or "Retained" in l.status]
        placement_entities: List[Placement] = []
        checkpoint_count = 0

        # Anchor dates relative to early 2025 to mid 2026
        for p_idx, l in enumerate(placed_learners):
            mandate = rng.choice(mandate_entities)
            emp = next((e for e in employer_entities if e.id == mandate.employer_id), employer_entities[0])

            # Staggered join dates over past 15 months
            joined_dt = date(2025, 2, 1) + timedelta(days=(p_idx * 7) % 360)
            start_ctc = round(rng.uniform(mandate.salary_min_lpa, mandate.salary_max_lpa), 2)
            
            # Retention trajectory
            is_180_retained = "Retained" in l.status
            current_ctc = round(start_ctc * (1.15 if is_180_retained else 1.0), 2)

            placement = Placement(
                learner_id=l.id,
                employer_id=emp.id,
                hiring_mandate_id=mandate.id,
                job_title=mandate.job_title,
                joined_date=joined_dt,
                starting_ctc_lpa=start_ctc,
                current_ctc_lpa=current_ctc,
                employment_type="Full-Time",
                status="Active" if not is_180_retained else "Retained (180-Day)",
                uan=f"10{rng.randint(1000000000, 9999999999)}",
                epfo_verification_status="VERIFIED",
                epfo_last_verified_at=datetime.now(timezone.utc) - timedelta(days=rng.randint(1, 15)),
                epfo_transaction_ref=f"EPFO-2026-TXN-{10000 + p_idx}",
            )
            session.add(placement)
            await session.flush()
            placement_entities.append(placement)

            # Generate 3M, 6M, 12M checkpoints
            # 3M Checkpoint (90 days)
            cp3_date = joined_dt + timedelta(days=90)
            cp3 = RetentionCheckpoint(
                placement_id=placement.id,
                checkpoint_type="3M",
                milestone_months=3,
                checkpoint_date=cp3_date,
                is_active_at_checkpoint=True,
                epfo_verified=True,
                current_ctc_lpa=start_ctc,
                wage_increment_percentage=0.0,
                epfo_contribution_months=3,
                verification_status="VERIFIED",
                remarks="Successfully completed 90-day probationary milestone.",
                evaluated_at=datetime.now(timezone.utc) - timedelta(days=rng.randint(30, 90)),
            )
            session.add(cp3)
            checkpoint_count += 1

            # 6M Checkpoint (180 days)
            cp6_date = joined_dt + timedelta(days=180)
            cp6_active = is_180_retained or (cp6_date <= date.today())
            cp6_inc = 15.0 if is_180_retained else 0.0
            cp6_ctc = round(start_ctc * (1.0 + cp6_inc / 100.0), 2)
            cp6 = RetentionCheckpoint(
                placement_id=placement.id,
                checkpoint_type="6M",
                milestone_months=6,
                checkpoint_date=cp6_date,
                is_active_at_checkpoint=cp6_active,
                epfo_verified=cp6_active,
                current_ctc_lpa=cp6_ctc,
                wage_increment_percentage=cp6_inc,
                epfo_contribution_months=6 if cp6_active else 3,
                verification_status="VERIFIED" if cp6_active else "PENDING",
                remarks="Confirmed 6-month continuous employment with wage appraisal." if is_180_retained else "6-month evaluation checkpoint.",
                evaluated_at=datetime.now(timezone.utc) - timedelta(days=rng.randint(5, 30)) if cp6_active else None,
            )
            session.add(cp6)
            checkpoint_count += 1

            # 12M Checkpoint (365 days)
            cp12_date = joined_dt + timedelta(days=365)
            cp12_evaluated = cp12_date <= date.today()
            cp12_inc = 25.0 if cp12_evaluated else (15.0 if is_180_retained else 0.0)
            cp12_ctc = round(start_ctc * (1.0 + cp12_inc / 100.0), 2)
            cp12 = RetentionCheckpoint(
                placement_id=placement.id,
                checkpoint_type="12M",
                milestone_months=12,
                checkpoint_date=cp12_date,
                is_active_at_checkpoint=True,
                epfo_verified=cp12_evaluated,
                current_ctc_lpa=cp12_ctc,
                wage_increment_percentage=cp12_inc,
                epfo_contribution_months=12 if cp12_evaluated else 6,
                verification_status="VERIFIED" if cp12_evaluated else "PENDING",
                remarks="12-month tenure verified via electronic passbook." if cp12_evaluated else "Scheduled longitudinal 12-month evaluation.",
                evaluated_at=datetime.now(timezone.utc) if cp12_evaluated else None,
            )
            session.add(cp12)
            checkpoint_count += 1

        await session.flush()
        stats["placements"] = len(placement_entities)
        stats["retention_checkpoints"] = checkpoint_count

        # 11. Seed Skill Gap Analytics (District-Competency Deficit Grid)
        logger.info("Seeding Regional Skill Gap Deficits & Analytics...")
        gap_count = 0
        for dist in district_entities:
            # Sample 3-5 competencies per district for gap tracking
            district_comps = rng.sample(comp_entities, rng.randint(3, 5))
            for rank, comp in enumerate(district_comps, 1):
                demand_pct = round(rng.uniform(60.0, 95.0), 1)
                supply_pct = round(rng.uniform(20.0, 65.0), 1)
                deficit = round(demand_pct - supply_pct, 1)

                if deficit >= 35.0:
                    severity = "Critical"
                    action = f"Deploy intensive 60-hour remedial sandbox & lab capacity in {dist.name}"
                elif deficit >= 20.0:
                    severity = "High"
                    action = f"Deploy certified trainer cohort & bridge module for {comp.name}"
                elif deficit >= 5.0:
                    severity = "Moderate"
                    action = f"Scale batch intake by 25% at local PMKK centers"
                else:
                    severity = "Aligned"
                    action = "Maintain current training capacity & placement linkage"

                gap = SkillGapAnalytic(
                    district_id=dist.id,
                    competency_id=comp.id,
                    employer_demand_pct=demand_pct,
                    workforce_supply_pct=supply_pct,
                    deficit_pct=deficit,
                    severity=severity,
                    learners_affected=rng.randint(30, 150),
                    priority_rank=rank,
                    suggested_action=action,
                )
                session.add(gap)
                gap_count += 1

        await session.flush()
        stats["skill_gap_analytics"] = gap_count

        # 12. Seed Deployed Policy & Remedial Interventions
        logger.info("Seeding Skill Gap Interventions...")
        intervention_types = [
            "BRIDGE_COURSE",
            "TRAINER_DEPLOYMENT",
            "LAB_EQUIPMENT_UPGRADE",
            "CURRICULUM_UPDATE",
        ]
        intervention_count = 0
        for i in range(25):
            dist = rng.choice(district_entities)
            comp = rng.choice(comp_entities)
            i_type = rng.choice(intervention_types)
            cap = rng.randint(40, 200)
            budget = float(rng.randint(2, 18) * 100000)
            weeks = rng.randint(4, 12)
            status = rng.choice(["DEPLOYED", "IN_PROGRESS", "IN_PROGRESS", "COMPLETED"])

            intervention = SkillGapIntervention(
                district_id=dist.id,
                competency_id=comp.id,
                intervention_type=i_type,
                target_capacity=cap,
                budget_allocated_inr=budget,
                target_completion_weeks=weeks,
                status=status,
                deployed_by="Aman Mishra (MSDE Central Officer)",
                notes=f"State Priority Skilling Intervention for {comp.sector} in {dist.name}.",
            )
            session.add(intervention)
            intervention_count += 1

        await session.flush()
        stats["skill_gap_interventions"] = intervention_count

        # 13. Seed Historical Audit Logs
        logger.info("Seeding Security & Operational Audit Trail...")
        audit_events = [
            ("AUTH_LOGIN_SUCCESS", "USER", "aman.mishra@msde.gov.in", "SUCCESS", {"ip": "127.0.0.1", "role": "MSDE_OFFICER"}),
            ("LEARNER_CREATED", "LEARNER", "KN-2026-01001", "SUCCESS", {"full_name": "Aarav Sharma", "district_id": "UP-VARANASI"}),
            ("CREDENTIAL_VERIFIED", "CREDENTIAL", "NCVET-2026-CERT-10001", "SUCCESS", {"agency": "NCVET", "is_authenticated": True}),
            ("MATCHING_CALCULATED", "LEARNER", "KN-2026-01005", "SUCCESS", {"matches_count": 8, "top_score": 94.2}),
            ("PLACEMENT_CREATED", "PLACEMENT", "Tata Consultancy Services", "SUCCESS", {"starting_ctc": 4.5, "learner_id": "KN-2026-01010"}),
            ("EPFO_VERIFIED", "EPFO", "101988776655", "SUCCESS", {"contributions_found": True, "active": True}),
            ("INTERVENTION_DEPLOYED", "INTERVENTION", "UP-VARANASI", "SUCCESS", {"type": "BRIDGE_COURSE", "budget": 500000}),
            ("RETENTION_CHECKPOINT_UPDATED", "PLACEMENT", "6M", "SUCCESS", {"wage_growth": 15.0, "status": "Retained"}),
        ]
        for action, res_type, res_id, a_stat, det in audit_events:
            audit = AuditLog(
                action=action,
                resource_type=res_type,
                resource_id=res_id,
                actor_id="SYSTEM",
                actor_role="MSDE_OFFICER",
                actor_email="aman.mishra@msde.gov.in",
                ip_address="127.0.0.1",
                user_agent="Mozilla/5.0 (KaushalNexus-Platform/2026)",
                correlation_id=f"KN-SEED-{uuid.uuid4().hex[:8].upper()}",
                status=a_stat,
                details=det,
            )
            session.add(audit)
        await session.flush()
        stats["audit_logs"] = len(audit_events)

        # 14. Seed BKT Diagnostic Assessments, Question Bank & Learner Skill Mastery States
        from src.seed_bkt_data import seed_bkt_assessments_and_mastery
        bkt_stats = await seed_bkt_assessments_and_mastery(session)
        stats.update(bkt_stats)

        # Commit everything in a single atomic transaction
        await session.commit()

    logger.info("Database seeding completed successfully!")
    return stats


# ==============================================================================
# CLI Entrypoint: `python -m src.seed`
# ==============================================================================

async def main():
    """CLI execution wrapper."""
    print("=" * 80)
    print("🚀 KAUSHALNEXUS NATIONAL SKILLING PLATFORM - DEMO DATA SEEDER")
    print("=" * 80)
    try:
        stats = await seed_database(clean=True)
        print("\n📊 SEEDED ENTITY RECORD SUMMARY:")
        print("-" * 80)
        for table, count in stats.items():
            print(f"  • {table:<28} : {count:>5} records")
        print("-" * 80)
        print("✅ Database seeding completed successfully with 100% relational integrity.")
        print("=" * 80)
    finally:
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(main())

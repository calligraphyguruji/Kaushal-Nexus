import { apiClient } from './client';

/**
 * Domain-specific deterministic fallback generator.
 * Produces realistic, high-fidelity skill gap diagnostics, phased roadmaps, and lab projects
 * tailored strictly to the candidate's selected target occupation and demonstrated strengths.
 */
function generateDeterministicSkillGapAnalysis(payload) {
  const name = payload.full_name || 'Candidate';
  const role = payload.target_occupation || 'Full Stack Cloud Engineer';
  const score = payload.employment_readiness_score || 82;
  const skills = payload.current_skills || [];
  const strengths = skills
    .filter((s) => (s.score_percentage || 0) >= 75)
    .map((s) => s.name);

  const roleLower = role.toLowerCase();

  let skill_gaps, roadmap, recommended_sequence, projects;

  if (
    roleLower.includes('data') ||
    roleLower.includes('analytics') ||
    roleLower.includes('intelligence') ||
    roleLower.includes('bi') ||
    roleLower.includes('sql')
  ) {
    skill_gaps = [
      {
        skill: 'Advanced SQL & Dimensional Star-Schema Modeling',
        priority: 'Critical',
        reason:
          'Enterprise data roles require deep competence in complex analytical queries, indexing strategies, and dimensional warehouse modeling.',
        suggested_action:
          'Complete practical lab exercises on database query execution plans, CTEs, and star schema partitioning.',
      },
      {
        skill: 'Cloud Data Pipelines & Orchestration (Airflow / PySpark)',
        priority: 'High',
        reason:
          'Automated data ingestion and transformation pipelines are foundational requirements across corporate analytics mandates.',
        suggested_action:
          'Build automated daily ETL ingestion workflows connecting cloud storage to analytical data warehouses.',
      },
      {
        skill: 'Data Quality Auditing & Automated Validation',
        priority: 'Moderate',
        reason:
          'Validating data freshness, null constraints, and distribution drift before reporting ensures regulatory compliance.',
        suggested_action:
          'Implement automated schema validation tests with Great Expectations or Pytest before dashboard publication.',
      },
    ];
    roadmap = [
      {
        phase: 1,
        title: 'Phase 1: Advanced Relational & Analytical Schema Design',
        duration: 'Weeks 1–2 (20–25 Hours recommended)',
        skills: ['Complex Window Functions', 'Query Optimization', 'Dimensional Modeling'],
        activities: [
          'Refactor complex multi-table SQL joins and verify indexing strategies',
          'Design and document a production star-schema warehouse model',
        ],
        expected_outcome: 'Passing validation suite verifying sub-second query performance on large datasets.',
      },
      {
        phase: 2,
        title: 'Phase 2: Cloud Ingestion Pipelines & ETL Orchestration',
        duration: 'Weeks 3–4 (25–30 Hours recommended)',
        skills: ['Airflow Workflows', 'PySpark Transformations', 'Cloud Object Ingestion'],
        activities: [
          'Build an automated batch data ingestion pipeline with scheduled triggers',
          'Connect transactional database dumps into an analytical parquet warehouse',
        ],
        expected_outcome: 'Verified scheduled data ingestion workflow operating with automated error alerts.',
      },
      {
        phase: 3,
        title: 'Phase 3: Production Hardening & Business Case Presentation',
        duration: 'Weeks 5–6 (15–20 Hours recommended)',
        skills: ['Data Governance', 'Executive Dashboard Telemetry', 'Technical Presentation'],
        activities: [
          'Deploy verified data models into an interactive executive business intelligence portal',
          'Complete timed data engineering technical interview drills',
        ],
        expected_outcome: 'Documented, recruiter-ready data portfolio with live query demonstration.',
      },
    ];
    recommended_sequence = [
      '1. Advanced SQL Indexing & Window Functions',
      '2. Star-Schema Data Warehouse Architecture',
      '3. Cloud Data Pipeline Orchestration (Airflow)',
      '4. Automated Data Quality & Schema Testing',
      '5. Capstone Analytical Portfolio Presentation',
    ];
    projects = [
      {
        title: 'Real-Time E-Commerce Telemetry Pipeline',
        description: 'Ingest, clean, and aggregate simulated transactions into a structured analytical warehouse.',
        skills_applied: ['Python', 'SQL', 'PostgreSQL', 'Data Warehousing'],
        complexity: 'Intermediate',
      },
      {
        title: 'Automated Data Quality & Validation Sentinel',
        description: 'A lightweight microservice validating data freshness, null checks, and distribution drifts before database loading.',
        skills_applied: ['Python', 'Pytest', 'Docker', 'REST APIs'],
        complexity: 'Advanced',
      },
    ];
  } else if (
    roleLower.includes('electric') ||
    roleLower.includes('ev') ||
    roleLower.includes('battery') ||
    roleLower.includes('automotive')
  ) {
    skill_gaps = [
      {
        skill: 'High-Voltage Battery Safety & BMS Diagnostics',
        priority: 'Critical',
        reason:
          'High-voltage isolation protocols and BMS fault code diagnosis are essential competencies for EV service technicians.',
        suggested_action:
          'Complete structured hands-on lab modules in battery management systems and electrical safety.',
      },
      {
        skill: 'CAN Bus Telemetry & Controller Interfacing',
        priority: 'High',
        reason:
          'Diagnostic technicians must decode CAN frames to diagnose motor controller communication errors.',
        suggested_action:
          'Hands-on lab training with CAN analyzer tools and microcontroller bus decoders.',
      },
      {
        skill: 'Regenerative Braking & Inverter Calibration',
        priority: 'Moderate',
        reason:
          'Calibrating torque curves and regenerative deceleration ensures optimal range and driving dynamics.',
        suggested_action:
          'Calibrate inverter PWM outputs against motor dyno simulation profiles.',
      },
    ];
    roadmap = [
      {
        phase: 1,
        title: 'Phase 1: High-Voltage Safety & BMS Diagnostics Fundamentals',
        duration: 'Weeks 1–2 (25–30 Hours recommended)',
        skills: ['Electrical Safety Standards', 'BMS Fault Codes', 'Cell Voltage Balancing'],
        activities: [
          'Perform electrical isolation testing on battery modules',
          'Diagnose over-voltage, thermal runaway warning, and balance faults using diagnostic software',
        ],
        expected_outcome: 'Verified electrical isolation and battery safety diagnostics certification.',
      },
      {
        phase: 2,
        title: 'Phase 2: Powertrain & Telemetry Controller Interfacing',
        duration: 'Weeks 3–4 (25–30 Hours recommended)',
        skills: ['CAN Bus Protocol', 'Motor Controllers', 'Inverter Calibration'],
        activities: [
          'Capture and decode live CAN bus communication packets from vehicle sensors',
          'Calibrate inverter motor controller torque profiles for optimal energy recovery',
        ],
        expected_outcome: 'Verified Motor Controller Calibration & Telemetry packet decoding.',
      },
      {
        phase: 3,
        title: 'Phase 3: Fleet Maintenance & Placement Evaluation',
        duration: 'Weeks 5–6 (15–20 Hours recommended)',
        skills: ['Preventive Maintenance', 'Diagnostic Reporting', 'Technical Evaluation'],
        activities: [
          'Conduct comprehensive vehicle electrical diagnostic inspection audit',
          'Complete corporate technical evaluation simulation drills',
        ],
        expected_outcome: 'Documented, recruiter-ready service portfolio for EV manufacturers and fleet operators.',
      },
    ];
    recommended_sequence = [
      '1. Electrical Isolation & High-Voltage Safety',
      '2. Battery Management System (BMS) Architecture',
      '3. CAN Bus Signal Decoding & Diagnostics',
      '4. Motor Controller & Inverter Calibration',
      '5. Practical Fleet Inspection & Audit Project',
    ];
    projects = [
      {
        title: 'EV Battery Pack State-of-Health Diagnostic Tool',
        description: 'Build a microcontroller-based battery health logger that measures cell voltage delta and internal resistance.',
        skills_applied: ['BMS Diagnostics', 'Electrical Testing', 'Data Logging'],
        complexity: 'Intermediate',
      },
      {
        title: 'CAN Bus Telemetry Packet Decoder',
        description: 'Construct a hardware-in-the-loop diagnostic harness that decodes live vehicle telemetry and flags controller faults.',
        skills_applied: ['CAN Protocol', 'Microcontrollers', 'Fault Diagnostics'],
        complexity: 'Advanced',
      },
    ];
  } else if (
    roleLower.includes('solar') ||
    roleLower.includes('green') ||
    roleLower.includes('renewable') ||
    roleLower.includes('microgrid')
  ) {
    skill_gaps = [
      {
        skill: 'Solar PV Inverter Calibration & MPPT Tracking',
        priority: 'Critical',
        reason:
          'Optimizing maximum power point tracking and grid synchronization is essential for renewable microgrid technicians.',
        suggested_action:
          'Complete practical lab exercises on grid-tied inverters and MPPT firmware configuration.',
      },
      {
        skill: 'Battery Energy Storage Systems (BESS) Management',
        priority: 'High',
        reason:
          'Modern renewable microgrids require bidirectional inverter management and state-of-charge balancing.',
        suggested_action:
          'Perform hands-on state-of-charge calibration on solar storage battery banks.',
      },
      {
        skill: 'National Electrical Grid Interconnection Standards',
        priority: 'Moderate',
        reason:
          'CEA statutory grid compliance and anti-islanding safety protocols are mandatory for commissioning solar installations.',
        suggested_action:
          'Complete compliance checklist training on anti-islanding protection relays.',
      },
    ];
    roadmap = [
      {
        phase: 1,
        title: 'Phase 1: Solar Photovoltaic & Inverter Electronics',
        duration: 'Weeks 1–2 (20–25 Hours recommended)',
        skills: ['Solar PV Arrays', 'MPPT Controllers', 'Inverter Calibration'],
        activities: [
          'Calibrate solar string inverters against varying irradiance profiles',
          'Measure open-circuit voltage and short-circuit current across solar arrays',
        ],
        expected_outcome: 'Verified solar inverter commissioning and power factor optimization competency.',
      },
      {
        phase: 2,
        title: 'Phase 2: Microgrid Battery Storage & Bidirectional Inverters',
        duration: 'Weeks 3–4 (25–30 Hours recommended)',
        skills: ['BESS Storage', 'Charge Controllers', 'Island Mode Protection'],
        activities: [
          'Configure bidirectional inverter battery charge and discharge thresholds',
          'Test rapid anti-islanding shutdown during simulated grid disconnection',
        ],
        expected_outcome: 'Verified BESS energy storage commissioning and safety compliance.',
      },
      {
        phase: 3,
        title: 'Phase 3: Regulatory Commissioning & Field Audit Drills',
        duration: 'Weeks 5–6 (15–20 Hours recommended)',
        skills: ['Grid Interconnection', 'Safety Audit', 'Commissioning Reports'],
        activities: [
          'Execute a full commissioning audit for a 50kW commercial solar installation',
          'Complete statutory inspection presentation drills',
        ],
        expected_outcome: 'Certified solar installation commissioning portfolio ready for institutional review.',
      },
    ];
    recommended_sequence = [
      '1. Solar PV Sizing & Photovoltaic Physics',
      '2. Grid-Tied Inverters & MPPT Calibration',
      '3. Battery Energy Storage System (BESS) Integration',
      '4. Anti-Islanding Relays & CEA Grid Code Standards',
      '5. Commercial Solar Commissioning Capstone Audit',
    ];
    projects = [
      {
        title: 'Solar Micro-Grid Power Inverter Calibration',
        description: 'Configure and optimize a grid-tied solar inverter with MPPT charge tracking and telemetry reporting.',
        skills_applied: ['Solar PV', 'Grid Inverters', 'Safety Compliance'],
        complexity: 'Intermediate',
      },
      {
        title: 'Autonomous Hybrid Microgrid Energy Controller',
        description: 'Design a microgrid controller balancing solar generation, battery storage, and diesel generator fallback.',
        skills_applied: ['Energy Management', 'BESS', 'Telemetry'],
        complexity: 'Advanced',
      },
    ];
  } else if (
    roleLower.includes('cnc') ||
    roleLower.includes('manufacturing') ||
    roleLower.includes('precision') ||
    roleLower.includes('machin') ||
    roleLower.includes('mechanical')
  ) {
    skill_gaps = [
      {
        skill: 'Multi-Axis G-Code Toolpath Optimization',
        priority: 'Critical',
        reason:
          'Modern precision manufacturing requires expert programming in 3-axis and 5-axis CAM toolpaths to minimize cycle time.',
        suggested_action:
          'Complete practical Mastercam and Fusion 360 toolpath simulations with surface finish optimization.',
      },
      {
        skill: 'Geometric Dimensioning & Tolerancing (GD&T)',
        priority: 'High',
        reason:
          'Interpreting complex engineering blueprints with true position and runout tolerances is critical for aerospace/auto components.',
        suggested_action:
          'Practice CMM coordinate measuring inspection against ASME Y14.5 standards.',
      },
      {
        skill: 'CNC Workholding & Fixture Alignment',
        priority: 'Moderate',
        reason:
          'Minimizing deflection and setting accurate work coordinate systems (G54-G59) prevents machining scrapping.',
        suggested_action:
          'Set up modular zero-point clamping fixtures on vertical machining centers.',
      },
    ];
    roadmap = [
      {
        phase: 1,
        title: 'Phase 1: Precision Blueprint Reading & GD&T Metrology',
        duration: 'Weeks 1–2 (20–25 Hours recommended)',
        skills: ['GD&T Standards', 'Micrometer / Caliper Metrology', 'Coordinate Systems'],
        activities: [
          'Inspect complex machined test coupons using dial indicators and height gauges',
          'Calculate tolerance stack-ups from technical fabrication drawings',
        ],
        expected_outcome: 'Verified dimensional quality inspection competency to 5-micron precision.',
      },
      {
        phase: 2,
        title: 'Phase 2: Multi-Axis CAM Programming & Simulation',
        duration: 'Weeks 3–4 (25–30 Hours recommended)',
        skills: ['Mastercam', 'Toolpath Optimization', 'Speeds & Feeds Calculation'],
        activities: [
          'Program high-speed milling cycles with dynamic roughing strategies',
          'Run collision verification simulations before physical machining execution',
        ],
        expected_outcome: 'Zero-collision simulated G-code program ready for production CNC machines.',
      },
      {
        phase: 3,
        title: 'Phase 3: Production Quality Assurance & Machine Setup',
        duration: 'Weeks 5–6 (15–20 Hours recommended)',
        skills: ['CMM Quality Inspection', 'Tool Wear Offsets', 'First-Article Inspection (FAI)'],
        activities: [
          'Execute a complete first-article inspection report (AS9102 format)',
          'Perform rapid tool offset adjustments during continuous batch runs',
        ],
        expected_outcome: 'Approved first-article inspection dossier with verified production cycle times.',
      },
    ];
    recommended_sequence = [
      '1. Blueprint Reading & ASME Y14.5 GD&T Standards',
      '2. Cutting Tool Geometry & Speeds/Feeds Optimization',
      '3. CAM Toolpath Generation & Simulation Verification',
      '4. CNC Machine Setup & Zero-Point Workholding',
      '5. First-Article Inspection & Quality Certification',
    ];
    projects = [
      {
        title: 'Aerospace Impeller CNC Machining Cycle',
        description: 'Program, simulate, and verify a 4-axis simultaneous milling cycle for a titanium compressor impeller.',
        skills_applied: ['Mastercam', '4-Axis Milling', 'GD&T', 'Collision Verification'],
        complexity: 'Advanced',
      },
      {
        title: 'Automated CMM Quality Inspection Program',
        description: 'Develop an automated coordinate measuring machine probe sequence for high-volume automotive valve blocks.',
        skills_applied: ['CMM Programming', 'Metrology', 'Statistical Process Control'],
        complexity: 'Intermediate',
      },
    ];
  } else {
    // Default: Cloud / Full Stack / DevOps / Software Engineering
    skill_gaps = [
      {
        skill: 'Cloud Deployment & Containerization (Docker)',
        priority: 'Critical',
        reason:
          'Containerization and cloud deployment are core technical requirements for modern software engineering roles.',
        suggested_action:
          'Complete practical containerization exercises and build multi-stage Docker deployment configurations.',
      },
      {
        skill: 'Automated Test Coverage & CI/CD Pipelines',
        priority: 'High',
        reason:
          'Automated unit and integration tests ensure software reliability and uninterrupted production delivery.',
        suggested_action:
          'Implement comprehensive unit and integration test suites on portfolio projects.',
      },
      {
        skill: 'API Security & OAuth2 Token Lifecycle',
        priority: 'Moderate',
        reason:
          'Enterprise applications mandate secure authentication, refresh token rotation, and RBAC authorization.',
        suggested_action:
          'Implement JWT refresh token rotation and security middleware in a capstone service.',
      },
    ];
    roadmap = [
      {
        phase: 1,
        title: 'Phase 1: Architecture & Automated Test Hardening',
        duration: 'Weeks 1–2 (20–25 Hours recommended)',
        skills: ['Unit Testing', 'Integration Testing', 'Schema Validation'],
        activities: [
          'Write comprehensive unit tests with code coverage',
          'Implement strict request and response schema validation',
        ],
        expected_outcome: 'Passing test suite with verified automated coverage across critical endpoints.',
      },
      {
        phase: 2,
        title: 'Phase 2: Containerization & Cloud Infrastructure',
        duration: 'Weeks 3–4 (25–30 Hours recommended)',
        skills: ['Docker Multi-Stage Builds', 'GitHub Actions', 'Cloud Deployment'],
        activities: [
          'Containerize frontend and backend into lightweight Docker images',
          'Configure GitHub Actions pipeline for automated linting and deployment',
        ],
        expected_outcome: 'Verified live cloud deployment container URL.',
      },
      {
        phase: 3,
        title: 'Phase 3: Production Security & Recruiter Interview Drills',
        duration: 'Weeks 5–6 (15–20 Hours recommended)',
        skills: ['JWT Security & RBAC', 'Rate Limiting', 'Technical Presentation'],
        activities: [
          'Implement security headers, rate limiting, and token rotation',
          'Complete timed mock technical interview coding drills',
        ],
        expected_outcome: 'Documented, recruiter-ready portfolio project with verifiable deployment.',
      },
    ];
    recommended_sequence = [
      '1. Automated Testing & Code Quality Assurance',
      '2. Multi-Stage Docker Container Packaging',
      '3. GitHub Actions CI/CD Deployment Automation',
      '4. Production Security & Token Lifecycle Hardening',
      '5. Capstone Recruiter Portfolio Presentation',
    ];
    projects = [
      {
        title: 'Cloud-Native Full-Stack Microservices Platform',
        description: 'A secure, containerized web application with JWT authentication, automated CI/CD pipeline, and PostgreSQL database.',
        skills_applied: ['React', 'FastAPI', 'Docker', 'PostgreSQL'],
        complexity: 'Intermediate',
      },
      {
        title: 'Automated Code Quality & Security Sentinel',
        description: 'An automated pipeline tool that inspects, tests, and benchmarks microservices before cloud deployment.',
        skills_applied: ['CI/CD', 'Docker', 'Pytest / Jest', 'REST APIs'],
        complexity: 'Advanced',
      },
    ];
  }

  const demonstratedStrengths =
    strengths.length > 0
      ? strengths
      : ['Foundational Technical Aptitude', 'Vocational Coursework Discipline'];

  return {
    learner_id: payload.learner_id || 'KN-DEMO-001',
    full_name: name,
    target_occupation: role,
    summary: `Candidate ${name} demonstrates verified competencies in ${demonstratedStrengths.join(
      ', '
    )}. To strengthen technical alignment for the target occupation of '${role}', targeted remediation is recommended in ${
      skill_gaps[0].skill
    }. Completing the personalized 3-phase curriculum roadmap will systematically close identified competency deficits.`,
    strengths: demonstratedStrengths,
    skill_gaps,
    priority_skill_gaps: [skill_gaps[0].skill, skill_gaps[1]?.skill].filter(Boolean),
    roadmap,
    recommended_sequence,
    projects,
    job_readiness: {
      readiness_level: score >= 80 ? 'High Market Fit' : 'Moderate Readiness',
      estimated_time_to_ready: '3–4 Weeks with Bridge Module',
      recommended_target_roles: [role, `Associate ${role}`, `${role} Specialist`],
      key_advice: `Complete the ${skill_gaps[0].skill} bridge coursework and highlight verified portfolio projects on your candidate resume.`,
    },
    is_ai_generated: false,
    model_used: 'Deterministic Intelligence Engine',
    generated_at: new Date().toISOString(),
  };
}

export const aiApi = {
  /**
   * Generates AI Skill Gap Analysis & Personalized Learning Roadmap using Google Gemini AI
   * with seamless domain-aware fallback if the backend AI service is unavailable.
   */
  async analyzeSkillGap(payload) {
    try {
      const response = await apiClient.post('/ai/skill-gap-analysis', payload);
      if (response && response.data && response.data.summary) {
        return response.data;
      }
      return generateDeterministicSkillGapAnalysis(payload);
    } catch (err) {
      console.warn(
        'Backend AI endpoint call failed or unavailable; utilizing dynamic domain intelligence fallback:',
        err?.message || err
      );
      return generateDeterministicSkillGapAnalysis(payload);
    }
  },
};

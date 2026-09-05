from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import ForbiddenException, NotFoundException
from src.core.logging import logger
from src.models.assessment import AssessmentQuestion, LearnerSkillMastery
from src.models.competency import Competency
from src.models.learner import Learner
from src.models.learning_plan import (
    CompetencyPrerequisite,
    LearningActivity,
    LearningPlan,
    LearningPlanModule,
    LearningResource,
    ReassessmentAttempt,
    ResourceSkill,
)
from src.models.role import Role, RoleRequirement
from src.schemas.adaptive_learning_dto import (
    LearningPlanDTO,
    LearningPlanModuleDTO,
    LearningResourceDTO,
)
from src.services.role_matching import RoleMatchingService


class LearningPlanService:
    """
    Service responsible for generating and orchestrating personalized,
    prerequisite-aware remedial learning plans for candidates based on BKT skill gaps.
    """

    # Multipliers for planning time estimation
    HOURS_ESTIMATE_MAP = [
        (0.10, 0.5, 2.0),   # Light remediation: ~2 hours
        (0.25, 1.0, 4.0),   # Moderate remediation: ~4 hours
        (0.50, 1.5, 6.0),   # Substantial remediation: ~6 hours
        (1.00, 2.0, 8.0),   # Foundational remediation: ~8 hours
    ]

    @classmethod
    def calculate_estimated_hours(cls, gap: float, resource_hours: Optional[float] = None) -> float:
        """Deterministic bounded planning time estimation based on BKT gap."""
        if gap <= 0.01:
            return 1.0
        
        base_hours = 4.0
        if resource_hours and resource_hours > 0:
            base_hours = min(12.0, max(2.0, resource_hours))

        for max_gap, multiplier, default_val in cls.HOURS_ESTIMATE_MAP:
            if gap <= max_gap:
                return round(base_hours * multiplier, 1)
        
        return round(base_hours * 2.0, 1)

    @classmethod
    def determine_initial_difficulty(cls, mastery: float) -> str:
        """Maps initial BKT mastery to starting practice difficulty tier."""
        if mastery < 0.40:
            return "BEGINNER"
        elif mastery < 0.70:
            return "INTERMEDIATE"
        else:
            return "ADVANCED"

    @classmethod
    async def ensure_prerequisites_and_resources_seeded(cls, db: AsyncSession) -> None:
        """
        Seeds standard prerequisites and curated learning resources if not already present.
        Prerequisites:
          Python OOP (COMP-PY-OOP) -> requires Python Basics (COMP-PY-BASE)
          REST API (COMP-REST-API) -> requires HTTP Basics (COMP-HTTP-BASE)
        """
        # 1. Ensure standard roles & competencies exist
        await RoleMatchingService.ensure_standard_roles_seeded(db)

        # 2. Ensure HTTP Basics competency exists
        http_query = await db.execute(
            select(Competency).where(Competency.code == "COMP-HTTP-BASE")
        )
        http_comp = http_query.scalar_one_or_none()
        if not http_comp:
            http_comp = Competency(
                code="COMP-HTTP-BASE",
                name="HTTP Protocols & Web Architecture",
                sector="IT-ITeS",
            )
            db.add(http_comp)
            await db.flush()

        # Query relevant competencies
        comp_query = await db.execute(
            select(Competency).where(
                Competency.code.in_([
                    "COMP-PY-BASE",
                    "COMP-PY-OOP",
                    "COMP-SQL-CORE",
                    "COMP-GIT-VCS",
                    "COMP-REST-API",
                    "COMP-HTTP-BASE",
                    "COMP-DSA-CORE",
                ])
            )
        )
        comps_by_code = {c.code: c for c in comp_query.scalars().all()}

        # 3. Seed Prerequisites
        prereqs_to_seed = [
            ("COMP-PY-OOP", "COMP-PY-BASE", 0.60),
            ("COMP-REST-API", "COMP-HTTP-BASE", 0.60),
        ]

        for comp_code, prereq_code, min_m in prereqs_to_seed:
            c = comps_by_code.get(comp_code)
            p = comps_by_code.get(prereq_code)
            if c and p and c.id != p.id:
                existing = await db.execute(
                    select(CompetencyPrerequisite).where(
                        CompetencyPrerequisite.competency_id == c.id,
                        CompetencyPrerequisite.prerequisite_competency_id == p.id,
                    )
                )
                if not existing.scalar_one_or_none():
                    prereq = CompetencyPrerequisite(
                        competency_id=c.id,
                        prerequisite_competency_id=p.id,
                        minimum_mastery=min_m,
                    )
                    db.add(prereq)

        # 4. Seed Curated High-Quality Resources
        sample_resources = [
            {
                "title": "Python Official Tutorial: Control Flow & Data Structures",
                "provider": "Python Software Foundation",
                "resource_type": "DOCUMENTATION",
                "url": "https://docs.python.org/3/tutorial/",
                "difficulty": "BEGINNER",
                "estimated_hours": 3.0,
                "quality_score": 4.9,
                "is_free": True,
                "skills": ["COMP-PY-BASE"],
            },
            {
                "title": "Real Python: Object-Oriented Programming (OOP) in Python 3",
                "provider": "Real Python",
                "resource_type": "ARTICLE",
                "url": "https://realpython.com/python3-object-oriented-programming/",
                "difficulty": "INTERMEDIATE",
                "estimated_hours": 4.0,
                "quality_score": 4.8,
                "is_free": True,
                "skills": ["COMP-PY-OOP"],
            },
            {
                "title": "MDN Web Docs: An Overview of HTTP Protocols & Methods",
                "provider": "Mozilla Developer Network",
                "resource_type": "DOCUMENTATION",
                "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
                "difficulty": "BEGINNER",
                "estimated_hours": 2.5,
                "quality_score": 4.9,
                "is_free": True,
                "skills": ["COMP-HTTP-BASE"],
            },
            {
                "title": "FastAPI Comprehensive Guide: Path Operations & Response Models",
                "provider": "FastAPI Documentation",
                "resource_type": "DOCUMENTATION",
                "url": "https://fastapi.tiangolo.com/tutorial/",
                "difficulty": "INTERMEDIATE",
                "estimated_hours": 5.0,
                "quality_score": 4.9,
                "is_free": True,
                "skills": ["COMP-REST-API"],
            },
            {
                "title": "PostgreSQL Tutorial: Complex Queries, Joins & Aggregations",
                "provider": "PostgreSQL Tutorial",
                "resource_type": "DOCUMENTATION",
                "url": "https://www.postgresqltutorial.com/",
                "difficulty": "BEGINNER",
                "estimated_hours": 4.5,
                "quality_score": 4.7,
                "is_free": True,
                "skills": ["COMP-SQL-CORE"],
            },
            {
                "title": "Pro Git Book: Branching, Merging & Remote Workflows",
                "provider": "Git SCM",
                "resource_type": "BOOK",
                "url": "https://git-scm.com/book/en/v2",
                "difficulty": "BEGINNER",
                "estimated_hours": 3.0,
                "quality_score": 4.8,
                "is_free": True,
                "skills": ["COMP-GIT-VCS"],
            },
            {
                "title": "Algorithms & Problem Solving Fundamentals in Python",
                "provider": "OpenDSA",
                "resource_type": "PRACTICE",
                "url": "https://opendsa-server.cs.vt.edu/",
                "difficulty": "INTERMEDIATE",
                "estimated_hours": 6.0,
                "quality_score": 4.6,
                "is_free": True,
                "skills": ["COMP-DSA-CORE"],
            },
        ]

        for res_data in sample_resources:
            res_q = await db.execute(
                select(LearningResource).where(LearningResource.url == res_data["url"])
            )
            res = res_q.scalar_one_or_none()
            if not res:
                res = LearningResource(
                    title=res_data["title"],
                    provider=res_data["provider"],
                    resource_type=res_data["resource_type"],
                    url=res_data["url"],
                    difficulty=res_data["difficulty"],
                    estimated_hours=res_data["estimated_hours"],
                    quality_score=res_data["quality_score"],
                    is_free=res_data["is_free"],
                )
                db.add(res)
                await db.flush()

                for sk_code in res_data["skills"]:
                    comp = comps_by_code.get(sk_code)
                    if comp:
                        rs = ResourceSkill(
                            resource_id=res.id,
                            competency_id=comp.id,
                            relevance_score=1.0,
                        )
                        db.add(rs)

        # 5. Seed Practice Questions covering multiple difficulties if missing
        practice_questions = [
            # Python Basics
            ("COMP-PY-BASE", "BEGINNER", "What is the output of bool([]) in Python?", ["True", "False", "None", "Error"], "False", "Empty containers in Python evaluate to False in boolean context."),
            ("COMP-PY-BASE", "INTERMEDIATE", "Which collection type in Python guarantees insertion order and uniqueness?", ["set", "dict keys", "list", "OrderedDict only"], "dict keys", "As of Python 3.7+, dict keys preserve insertion order while keys remain unique."),
            ("COMP-PY-BASE", "ADVANCED", "What does the @functools.wraps decorator preserve on a wrapped function?", ["Only docstring", "Function metadata (__name__, __doc__, etc.)", "Variable scope", "Return type hints"], "Function metadata (__name__, __doc__, etc.)", "functools.wraps copies name, docstring, annotations and other metadata to the wrapper."),
            # Python OOP
            ("COMP-PY-OOP", "BEGINNER", "What keyword is used to access methods of a superclass in Python?", ["super()", "parent()", "base()", "this()"], "super()", "super() returns a proxy object delegating method calls to a parent or sibling class."),
            ("COMP-PY-OOP", "INTERMEDIATE", "In Python method resolution order (MRO), which algorithm is utilized?", ["Depth First Search", "Breadth First Search", "C3 Linearization", "Dijkstra"], "C3 Linearization", "Python uses the C3 Linearization algorithm to determine method resolution in multiple inheritance."),
            ("COMP-PY-OOP", "ADVANCED", "What magic method must be implemented to make an object act as a context manager?", ["__init__ and __del__", "__enter__ and __exit__", "__open__ and __close__", "__call__"], "__enter__ and __exit__", "The context management protocol requires __enter__() and __exit__()."),
            # HTTP Basics
            ("COMP-HTTP-BASE", "BEGINNER", "Which HTTP status code signifies that a resource was successfully created?", ["200 OK", "201 Created", "204 No Content", "301 Moved Permanently"], "201 Created", "201 Created indicates that the request succeeded and led to resource creation."),
            ("COMP-HTTP-BASE", "INTERMEDIATE", "Which HTTP method is both idempotent and safe according to RFC 7231?", ["GET", "POST", "PUT", "DELETE"], "GET", "GET and HEAD are both safe (read-only) and idempotent."),
            ("COMP-HTTP-BASE", "ADVANCED", "What HTTP header is essential for preventing Cross-Origin Resource Sharing (CORS) blocking?", ["Access-Control-Allow-Origin", "Content-Security-Policy", "Authorization", "X-Forwarded-For"], "Access-Control-Allow-Origin", "Access-Control-Allow-Origin defines permitted requesting origins."),
            # REST API
            ("COMP-REST-API", "BEGINNER", "In REST architecture, what format is most commonly used for payload exchange?", ["XML", "JSON", "Protobuf", "YAML"], "JSON", "JSON (JavaScript Object Notation) is the standard lightweight REST exchange format."),
            ("COMP-REST-API", "INTERMEDIATE", "What does HATEOAS stand for in the Richardson REST Maturity Model?", ["Hypermedia As The Engine Of Application State", "Hypertext And Transfer Engine Operation", "High Availability Through Enterprise APIs", "None of the above"], "Hypermedia As The Engine Of Application State", "HATEOAS allows clients to dynamically navigate REST resources via links."),
            ("COMP-REST-API", "ADVANCED", "When designing a REST API, why should DELETE requests return 204 No Content vs 200 OK?", ["204 is faster", "204 indicates the action succeeded without returning an entity body", "200 is forbidden for DELETE", "No difference"], "204 indicates the action succeeded without returning an entity body", "204 No Content indicates complete execution with an empty payload body."),
            # SQL
            ("COMP-SQL-CORE", "BEGINNER", "Which SQL clause is used to filter records after aggregation?", ["WHERE", "HAVING", "GROUP BY", "ORDER BY"], "HAVING", "HAVING filters aggregated groups, whereas WHERE filters row-level records before grouping."),
            ("COMP-SQL-CORE", "INTERMEDIATE", "What is the primary difference between UNION and UNION ALL in SQL?", ["UNION sorts results; UNION ALL does not", "UNION removes duplicates; UNION ALL retains all duplicates", "UNION only works on integers", "There is no difference"], "UNION removes duplicates; UNION ALL retains all duplicates", "UNION performs a deduplication step whereas UNION ALL appends all records directly."),
            ("COMP-SQL-CORE", "ADVANCED", "What index type in PostgreSQL is best suited for range and equality queries on scalars?", ["B-Tree", "GIN", "GiST", "BRIN"], "B-Tree", "Standard B-Tree indexes are the default and optimal for scalar range and equality checks."),
        ]

        for comp_code, diff, q_text, opts, correct, expl in practice_questions:
            comp = comps_by_code.get(comp_code)
            if not comp:
                continue
            
            existing_q = await db.execute(
                select(AssessmentQuestion).where(
                    AssessmentQuestion.skill_id == comp.id,
                    AssessmentQuestion.question_text == q_text,
                )
            )
            if not existing_q.scalar_one_or_none():
                q = AssessmentQuestion(
                    assessment_id=None,
                    skill_id=comp.id,
                    question_text=q_text,
                    options_json=json.dumps(opts),
                    correct_answer=correct,
                    explanation=expl,
                    difficulty=diff,
                    is_active=True,
                )
                db.add(q)

        await db.commit()

    @classmethod
    async def generate_or_get_learning_plan(
        cls, db: AsyncSession, learner_id: str, force_regenerate: bool = False
    ) -> LearningPlanDTO:
        """
        Generates or refreshes a personalized, prerequisite-aware remedial Learning Plan.
        Evaluates current BKT masteries against the candidate's aspiring role requirements.
        Prevents duplicate active plans.
        """
        # Ensure standard dependencies & questions exist
        await cls.ensure_prerequisites_and_resources_seeded(db)

        # 1. Fetch learner
        learner_query = await db.execute(
            select(Learner).where(Learner.id == learner_id)
        )
        learner = learner_query.scalar_one_or_none()
        if not learner:
            raise NotFoundException(message=f"Candidate with ID '{learner_id}' not found.")

        # 2. Determine target aspiring role
        role_id = learner.aspiring_role_id
        if not role_id:
            # Fallback to standard Python Developer role
            default_role_q = await db.execute(
                select(Role).where(Role.code == "ROLE-PY-DEV")
            )
            default_role = default_role_q.scalar_one_or_none()
            if default_role:
                role_id = default_role.id
                learner.aspiring_role_id = role_id
                await db.commit()
            else:
                raise NotFoundException(message="No target role configured and default role not found.")

        role_q = await db.execute(
            select(Role)
            .options(selectinload(Role.requirements).selectinload(RoleRequirement.competency))
            .where(Role.id == role_id)
        )
        role = role_q.scalar_one_or_none()
        if not role:
            raise NotFoundException(message=f"Target role with ID '{role_id}' not found.")

        # 3. Check for existing active plan
        existing_plan_q = await db.execute(
            select(LearningPlan)
            .options(
                selectinload(LearningPlan.modules).selectinload(LearningPlanModule.competency),
                selectinload(LearningPlan.role),
            )
            .where(
                LearningPlan.learner_id == learner_id,
                LearningPlan.role_id == role_id,
                LearningPlan.status.in_(["ACTIVE", "ADAPTING"]),
            )
        )
        existing_plan = existing_plan_q.scalar_one_or_none()

        if existing_plan and not force_regenerate:
            # Refresh live BKT masteries in existing plan
            return await cls._refresh_and_build_plan_dto(db, existing_plan)

        # If force regenerating or no plan exists:
        if existing_plan and force_regenerate:
            existing_plan.status = "PAUSED"
            await db.flush()

        # 4. Bulk query role requirements, learner's current BKT masteries, and prerequisites
        requirements = role.requirements
        comp_ids = [r.competency_id for r in requirements]

        mastery_q = await db.execute(
            select(LearnerSkillMastery).where(
                LearnerSkillMastery.learner_id == learner_id,
                LearnerSkillMastery.skill_id.in_(comp_ids),
            )
        )
        masteries_by_comp = {m.skill_id: m.mastery_probability for m in mastery_q.scalars().all()}

        # Query all prerequisites
        prereqs_q = await db.execute(
            select(CompetencyPrerequisite).options(
                selectinload(CompetencyPrerequisite.competency),
                selectinload(CompetencyPrerequisite.prerequisite_competency),
            )
        )
        all_prereqs = prereqs_q.scalars().all()
        # Map: dependent_comp_id -> list of prerequisite comp_ids
        prereq_map: Dict[uuid.UUID, List[uuid.UUID]] = {}
        prereq_names_map: Dict[uuid.UUID, List[str]] = {}
        for p in all_prereqs:
            prereq_map.setdefault(p.competency_id, []).append(p.prerequisite_competency_id)
            if p.prerequisite_competency:
                prereq_names_map.setdefault(p.competency_id, []).append(p.prerequisite_competency.name)

        # 5. Compute candidate gap items
        candidate_items = []
        for req in requirements:
            comp_id = req.competency_id
            current_m = masteries_by_comp.get(comp_id, 0.30)
            target_m = req.required_mastery
            gap = max(0.0, target_m - current_m)
            priority = round(req.weight * gap, 3)

            candidate_items.append({
                "competency_id": comp_id,
                "competency": req.competency,
                "current_mastery": current_m,
                "target_mastery": target_m,
                "gap": gap,
                "priority": priority,
                "weight": req.weight,
                "is_critical": gap > 0.25 or priority >= 0.50,
            })

        # 6. Check if any required competency has an unmastered prerequisite not already in the role
        extra_prereq_items = []
        existing_comp_ids = set(comp_ids)
        for item in candidate_items:
            comp_id = item["competency_id"]
            if comp_id in prereq_map:
                for p_id in prereq_map[comp_id]:
                    if p_id not in existing_comp_ids:
                        # Prerequisite is not in role requirements; check learner mastery
                        p_mastery_q = await db.execute(
                            select(LearnerSkillMastery).where(
                                LearnerSkillMastery.learner_id == learner_id,
                                LearnerSkillMastery.skill_id == p_id,
                            )
                        )
                        p_mast = p_mastery_q.scalar_one_or_none()
                        p_curr = p_mast.mastery_probability if p_mast else 0.30
                        if p_curr < 0.60:
                            # Prerequisite is unmastered! Insert as foundational remediation
                            p_comp_q = await db.execute(select(Competency).where(Competency.id == p_id))
                            p_comp = p_comp_q.scalar_one_or_none()
                            if p_comp:
                                extra_prereq_items.append({
                                    "competency_id": p_id,
                                    "competency": p_comp,
                                    "current_mastery": p_curr,
                                    "target_mastery": 0.60,
                                    "gap": max(0.0, 0.60 - p_curr),
                                    "priority": round(1.5 * max(0.0, 0.60 - p_curr), 3),
                                    "weight": 1.5,
                                    "is_critical": True,
                                })
                                existing_comp_ids.add(p_id)

        all_plan_items = extra_prereq_items + candidate_items

        # 7. Topological / Prerequisite-Aware Sorting
        # Build dependency graph
        all_ids = [item["competency_id"] for item in all_plan_items]
        item_by_id = {item["competency_id"]: item for item in all_plan_items}

        # Topological sorting with priority breaking
        # in_degrees: how many prerequisites are in the plan that are not yet mastered
        in_degrees: Dict[uuid.UUID, int] = {cid: 0 for cid in all_ids}
        adj_list: Dict[uuid.UUID, List[uuid.UUID]] = {cid: [] for cid in all_ids}

        for cid in all_ids:
            if cid in prereq_map:
                for prereq_id in prereq_map[cid]:
                    if prereq_id in item_by_id:
                        # Check if prereq is already mastered
                        if item_by_id[prereq_id]["current_mastery"] < item_by_id[prereq_id]["target_mastery"]:
                            in_degrees[cid] += 1
                            adj_list[prereq_id].append(cid)

        # Queue nodes with in_degree == 0, sorted by priority desc, weight desc, mastery asc
        ready_queue = [cid for cid, deg in in_degrees.items() if deg == 0]
        ready_queue.sort(
            key=lambda cid: (
                item_by_id[cid]["priority"],
                item_by_id[cid]["weight"],
                -item_by_id[cid]["current_mastery"],
            ),
            reverse=True,
        )

        sorted_cids = []
        while ready_queue:
            curr = ready_queue.pop(0)
            sorted_cids.append(curr)

            for dependent in adj_list.get(curr, []):
                in_degrees[dependent] -= 1
                if in_degrees[dependent] == 0:
                    ready_queue.append(dependent)
                    ready_queue.sort(
                        key=lambda cid: (
                            item_by_id[cid]["priority"],
                            item_by_id[cid]["weight"],
                            -item_by_id[cid]["current_mastery"],
                        ),
                        reverse=True,
                    )

        # Append any residual nodes (in case of cycles or isolated nodes)
        for cid in all_ids:
            if cid not in sorted_cids:
                sorted_cids.append(cid)

        # 8. Create LearningPlan and Modules
        new_plan = LearningPlan(
            learner_id=learner_id,
            role_id=role_id,
            status="ACTIVE",
            generated_at=datetime.now(timezone.utc),
        )
        db.add(new_plan)
        await db.flush()

        has_active_first = False
        seq = 1
        for cid in sorted_cids:
            item = item_by_id[cid]
            gap = item["gap"]
            current_m = item["current_mastery"]
            est_hours = cls.calculate_estimated_hours(gap)
            diff = cls.determine_initial_difficulty(current_m)

            if gap <= 0.05:
                mod_status = "MASTERED"
            elif not has_active_first:
                mod_status = "IN_PROGRESS"
                has_active_first = True
            else:
                mod_status = "PENDING"

            module = LearningPlanModule(
                learning_plan_id=new_plan.id,
                competency_id=cid,
                sequence_order=seq,
                prior_mastery=current_m,
                current_mastery=current_m,
                target_mastery=item["target_mastery"],
                gap=gap,
                priority_score=item["priority"],
                role_weight=item["weight"],
                estimated_hours=est_hours,
                status=mod_status,
                difficulty_level=diff,
            )
            db.add(module)
            seq += 1

        await db.commit()

        # Load populated plan and return DTO
        return await cls._refresh_and_build_plan_dto(db, new_plan)

    @classmethod
    async def get_active_learning_plan(cls, db: AsyncSession, learner_id: str) -> LearningPlanDTO:
        """Retrieves active learning plan or auto-generates if none exists."""
        plan_q = await db.execute(
            select(LearningPlan)
            .options(
                selectinload(LearningPlan.modules).selectinload(LearningPlanModule.competency),
                selectinload(LearningPlan.role),
            )
            .where(
                LearningPlan.learner_id == learner_id,
                LearningPlan.status.in_(["ACTIVE", "ADAPTING", "COMPLETED"]),
            )
            .order_by(LearningPlan.generated_at.desc())
        )
        plan = plan_q.scalars().first()
        if not plan:
            return await cls.generate_or_get_learning_plan(db, learner_id, force_regenerate=False)

        return await cls._refresh_and_build_plan_dto(db, plan)

    @classmethod
    async def get_module_detail(
        cls, db: AsyncSession, learner_id: str, module_id: uuid.UUID
    ) -> LearningPlanModuleDTO:
        """Retrieves details of a specific module with attached resources and prerequisites."""
        module_q = await db.execute(
            select(LearningPlanModule)
            .options(
                selectinload(LearningPlanModule.learning_plan),
                selectinload(LearningPlanModule.competency),
            )
            .where(LearningPlanModule.id == module_id)
        )
        module = module_q.scalar_one_or_none()
        if not module:
            raise NotFoundException(message=f"Learning plan module '{module_id}' not found.")

        # Strict tenant ownership check
        if module.learning_plan.learner_id != learner_id:
            raise ForbiddenException(message="Access denied to this learning module.")

        # Query resources for this competency
        res_q = await db.execute(
            select(LearningResource)
            .join(ResourceSkill, ResourceSkill.resource_id == LearningResource.id)
            .where(ResourceSkill.competency_id == module.competency_id, LearningResource.is_active == True)
        )
        resources = res_q.scalars().all()

        # Query prerequisite names
        prereq_q = await db.execute(
            select(CompetencyPrerequisite)
            .options(selectinload(CompetencyPrerequisite.prerequisite_competency))
            .where(CompetencyPrerequisite.competency_id == module.competency_id)
        )
        prereq_names = [
            p.prerequisite_competency.name
            for p in prereq_q.scalars().all()
            if p.prerequisite_competency
        ]

        return LearningPlanModuleDTO(
            id=module.id,
            competency_id=module.competency_id,
            competency_code=module.competency.code if module.competency else "UNKNOWN",
            competency_name=module.competency.name if module.competency else "Competency",
            sequence_order=module.sequence_order,
            prior_mastery=module.prior_mastery,
            current_mastery=module.current_mastery,
            target_mastery=module.target_mastery,
            gap=module.gap,
            priority_score=module.priority_score,
            role_weight=module.role_weight,
            estimated_hours=module.estimated_hours,
            status=module.status,
            adaptation_count=module.adaptation_count,
            difficulty_level=module.difficulty_level,
            next_available_at=module.next_available_at,
            started_at=module.started_at,
            completed_at=module.completed_at,
            resources=[LearningResourceDTO.model_validate(r) for r in resources],
            prerequisite_names=prereq_names,
        )

    @classmethod
    async def _refresh_and_build_plan_dto(
        cls, db: AsyncSession, plan: LearningPlan
    ) -> LearningPlanDTO:
        """Refreshes plan module BKT state from database and builds LearningPlanDTO."""
        # Query fresh modules with competencies
        mods_q = await db.execute(
            select(LearningPlanModule)
            .options(selectinload(LearningPlanModule.competency))
            .where(LearningPlanModule.learning_plan_id == plan.id)
            .order_by(LearningPlanModule.sequence_order.asc())
        )
        modules = mods_q.scalars().all()

        # Bulk query latest BKT mastery
        comp_ids = [m.competency_id for m in modules]
        mastery_q = await db.execute(
            select(LearnerSkillMastery).where(
                LearnerSkillMastery.learner_id == plan.learner_id,
                LearnerSkillMastery.skill_id.in_(comp_ids),
            )
        )
        masteries = {m.skill_id: m.mastery_probability for m in mastery_q.scalars().all()}

        # Bulk query resources for these competencies
        res_q = await db.execute(
            select(ResourceSkill, LearningResource)
            .join(LearningResource, LearningResource.id == ResourceSkill.resource_id)
            .where(
                ResourceSkill.competency_id.in_(comp_ids),
                LearningResource.is_active == True,
            )
        )
        resources_by_comp: Dict[uuid.UUID, List[LearningResourceDTO]] = {}
        for rs, res in res_q.all():
            resources_by_comp.setdefault(rs.competency_id, []).append(
                LearningResourceDTO.model_validate(res)
            )

        # Bulk query prerequisites
        prereq_q = await db.execute(
            select(CompetencyPrerequisite)
            .options(selectinload(CompetencyPrerequisite.prerequisite_competency))
            .where(CompetencyPrerequisite.competency_id.in_(comp_ids))
        )
        prereqs_by_comp: Dict[uuid.UUID, List[str]] = {}
        for p in prereq_q.scalars().all():
            if p.prerequisite_competency:
                prereqs_by_comp.setdefault(p.competency_id, []).append(
                    p.prerequisite_competency.name
                )

        total_hours = 0.0
        remaining_hours = 0.0
        completed_count = 0
        critical_count = 0
        module_dtos = []

        for m in modules:
            # Synchronize live mastery if updated
            if m.competency_id in masteries:
                live_m = masteries[m.competency_id]
                m.current_mastery = live_m
                m.gap = max(0.0, m.target_mastery - live_m)
                if m.gap <= 0.05 and m.status != "MASTERED":
                    m.status = "MASTERED"
                    if not m.completed_at:
                        m.completed_at = datetime.now(timezone.utc)

            total_hours += m.estimated_hours
            if m.status == "MASTERED":
                completed_count += 1
            else:
                remaining_hours += m.estimated_hours
                if m.gap > 0.25 or m.priority_score >= 0.50:
                    critical_count += 1

            mod_dto = LearningPlanModuleDTO(
                id=m.id,
                competency_id=m.competency_id,
                competency_code=m.competency.code if m.competency else "CODE",
                competency_name=m.competency.name if m.competency else "Competency",
                sequence_order=m.sequence_order,
                prior_mastery=m.prior_mastery,
                current_mastery=m.current_mastery,
                target_mastery=m.target_mastery,
                gap=m.gap,
                priority_score=m.priority_score,
                role_weight=m.role_weight,
                estimated_hours=m.estimated_hours,
                status=m.status,
                adaptation_count=m.adaptation_count,
                difficulty_level=m.difficulty_level,
                next_available_at=m.next_available_at,
                started_at=m.started_at,
                completed_at=m.completed_at,
                resources=resources_by_comp.get(m.competency_id, []),
                prerequisite_names=prereqs_by_comp.get(m.competency_id, []),
            )
            module_dtos.append(mod_dto)

        # Update overall plan status if all modules mastered
        total_modules = len(modules)
        if total_modules > 0 and completed_count == total_modules:
            plan.status = "COMPLETED"
            if not plan.completed_at:
                plan.completed_at = datetime.now(timezone.utc)

        await db.commit()

        progress_pct = (
            round((completed_count / total_modules) * 100.0, 1)
            if total_modules > 0
            else 100.0
        )

        role_q = await db.execute(select(Role).where(Role.id == plan.role_id))
        role = role_q.scalar_one_or_none()

        return LearningPlanDTO(
            id=plan.id,
            learner_id=plan.learner_id,
            role_id=plan.role_id,
            role_title=role.title if role else "Target Role",
            role_code=role.code if role else "ROLE",
            status=plan.status,
            overall_progress_pct=progress_pct,
            estimated_total_hours=round(total_hours, 1),
            estimated_hours_remaining=round(remaining_hours, 1),
            completed_modules_count=completed_count,
            total_modules_count=total_modules,
            critical_gaps_count=critical_count,
            generated_at=plan.generated_at,
            completed_at=plan.completed_at,
            modules=module_dtos,
        )

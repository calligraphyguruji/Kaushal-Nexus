import asyncio
from datetime import datetime, timedelta, timezone
import json
import random
from typing import Dict, List, Tuple
import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import AsyncSessionLocal, dispose_engine
from src.core.logging import logger, setup_logging
from src.ml.bkt import bkt_engine
from src.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentSubmission,
    LearnerSkillHistory,
    LearnerSkillMastery,
)
from src.models.competency import Competency
from src.models.learner import Learner

# ==============================================================================
# Comprehensive Assessment Questions Mapped to Specific Skills
# ==============================================================================

QUESTIONS_BY_SKILL = {
    "Python Basics": [
        {
            "question": "What will `type([])` return in Python 3?",
            "options": ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<class 'dict'>"],
            "correct_answer": "<class 'list'>",
            "explanation": "Empty square brackets create a built-in Python list instance of type <class 'list'>.",
            "difficulty": "EASY",
        },
        {
            "question": "Which keyword is used to create an anonymous single-expression function in Python?",
            "options": ["def", "lambda", "inline", "func"],
            "correct_answer": "lambda",
            "explanation": "Lambda expressions create anonymous function objects in Python.",
            "difficulty": "EASY",
        },
        {
            "question": "What is the output of `[x**2 for x in range(4)]`?",
            "options": ["[0, 1, 4, 9]", "[1, 4, 9, 16]", "[0, 1, 2, 3]", "[0, 2, 4, 6]"],
            "correct_answer": "[0, 1, 4, 9]",
            "explanation": "range(4) produces 0, 1, 2, 3. Squaring each gives 0, 1, 4, 9.",
            "difficulty": "EASY",
        },
        {
            "question": "How do you safely access a dictionary value with a default fallback in Python?",
            "options": ["dict.get(key, default)", "dict.fetch(key, default)", "dict.lookup(key, default)", "dict.find(key, default)"],
            "correct_answer": "dict.get(key, default)",
            "explanation": "dict.get(key, default) returns the value if the key exists, otherwise the provided default without raising KeyError.",
            "difficulty": "MEDIUM",
        },
        {
            "question": "Which block is guaranteed to execute in Python whether an exception occurred or not?",
            "options": ["catch", "finally", "except", "ensure"],
            "correct_answer": "finally",
            "explanation": "The 'finally' clause is always executed prior to leaving the try statement, cleanup guarantee.",
            "difficulty": "MEDIUM",
        },
        {
            "question": "What is the primary difference between a list and a tuple in Python?",
            "options": [
                "Lists are mutable, tuples are immutable",
                "Tuples are mutable, lists are immutable",
                "Tuples cannot contain nested sequences",
                "Lists have fixed static length in memory",
            ],
            "correct_answer": "Lists are mutable, tuples are immutable",
            "explanation": "Lists allow in-place mutations (append, pop, slice assignments), whereas tuples cannot be modified after instantiation.",
            "difficulty": "MEDIUM",
        },
        {
            "question": "What does the `*args` syntax allow in a Python function definition?",
            "options": [
                "Accepting an arbitrary number of positional arguments as a tuple",
                "Accepting keyword arguments as a dictionary",
                "Dereferencing memory pointers directly",
                "Enforcing strict static type checking",
            ],
            "correct_answer": "Accepting an arbitrary number of positional arguments as a tuple",
            "explanation": "*args packs excess positional arguments into a single tuple parameter.",
            "difficulty": "HARD",
        },
    ],
    "Python OOP": [
        {
            "question": "What is inheritance in Python object-oriented programming?",
            "options": [
                "Mechanism allowing a child class to inherit attributes and methods from a parent class",
                "A technique to declare global variables shared across all threads",
                "A way to serialize classes into JSON strings",
                "Direct low-level memory allocation in the Python heap",
            ],
            "correct_answer": "Mechanism allowing a child class to inherit attributes and methods from a parent class",
            "explanation": "Inheritance enables code reuse and polymorphism by allowing a subclass to derive behavior from a base class.",
            "difficulty": "EASY",
        },
        {
            "question": "Which method acts as the primary instance initializer in Python classes?",
            "options": ["__init__()", "__new__()", "__construct__()", "__start__()"],
            "correct_answer": "__init__()",
            "explanation": "__init__() initializes the attributes of a freshly created class instance.",
            "difficulty": "EASY",
        },
        {
            "question": "What is the purpose of the `super()` function in a Python subclass?",
            "options": [
                "Calls methods and constructors of the parent/superclass",
                "Creates a root object with OS root privileges",
                "Overrides memory allocation limits for the object",
                "Converts the class into a singleton metaclass",
            ],
            "correct_answer": "Calls methods and constructors of the parent/superclass",
            "explanation": "super() returns a proxy object delegating method calls to a parent or sibling class via Method Resolution Order (MRO).",
            "difficulty": "MEDIUM",
        },
        {
            "question": "What is polymorphism in Python OOP?",
            "options": [
                "Ability of different classes to respond to the same interface or method name appropriately",
                "Restricting private attributes using name mangling",
                "Forcing all subclasses to inherit from a single parent",
                "Compiling multiple classes into a single C extension",
            ],
            "correct_answer": "Ability of different classes to respond to the same interface or method name appropriately",
            "explanation": "Polymorphism allows algorithms to treat different objects uniformly through shared method signatures.",
            "difficulty": "MEDIUM",
        },
        {
            "question": "How do you define a private attribute in a Python class?",
            "options": [
                "Prefix the attribute name with double underscores e.g. __balance",
                "Use the 'private' keyword before the variable declaration",
                "Wrap the class in a @private decorator",
                "Define the attribute inside a staticmethod",
            ],
            "correct_answer": "Prefix the attribute name with double underscores e.g. __balance",
            "explanation": "Prefixing with double underscores triggers Python name mangling (e.g. _ClassName__balance) to prevent accidental external access.",
            "difficulty": "MEDIUM",
        },
        {
            "question": "Which decorator denotes a method that receives the class (cls) as its first argument rather than the instance (self)?",
            "options": ["@classmethod", "@staticmethod", "@property", "@abstractmethod"],
            "correct_answer": "@classmethod",
            "explanation": "@classmethod receives the class object 'cls' as the first parameter, enabling alternative constructors.",
            "difficulty": "HARD",
        },
    ],
    "SQL": [
        {
            "question": "Which SQL clause is used to filter aggregated grouped records after a GROUP BY statement?",
            "options": ["HAVING", "WHERE", "FILTER", "LIMIT"],
            "correct_answer": "HAVING",
            "explanation": "WHERE filters individual rows before aggregation; HAVING filters groups after aggregation.",
            "difficulty": "EASY",
        },
        {
            "question": "What is the primary difference between INNER JOIN and LEFT JOIN in SQL?",
            "options": [
                "INNER JOIN returns matching rows only; LEFT JOIN returns all rows from left table plus matching rows",
                "LEFT JOIN returns only non-matching rows",
                "INNER JOIN automatically creates an index on the join condition",
                "LEFT JOIN is strictly faster and requires less memory",
            ],
            "correct_answer": "INNER JOIN returns matching rows only; LEFT JOIN returns all rows from left table plus matching rows",
            "explanation": "A LEFT JOIN preserves every row from the left table and populates NULL for non-matching right table columns.",
            "difficulty": "MEDIUM",
        },
        {
            "question": "What does a B-Tree index on a relational database table primarily improve?",
            "options": [
                "SELECT query lookup speed and range filtering",
                "INSERT and batch bulk-load speed",
                "Physical disk compression ratio",
                "Network throughput between app and database",
            ],
            "correct_answer": "SELECT query lookup speed and range filtering",
            "explanation": "Indexes allow the query planner to quickly locate matching records without performing full sequential table scans.",
            "difficulty": "MEDIUM",
        },
        {
            "question": "Which SQL aggregate function computes the mathematical sum of values in a numeric column?",
            "options": ["SUM()", "COUNT()", "AVG()", "TOTAL()"],
            "correct_answer": "SUM()",
            "explanation": "SUM() aggregates the values of an expression across all rows in a group.",
            "difficulty": "EASY",
        },
        {
            "question": "Which command deletes all records from a table without firing individual row-level delete triggers?",
            "options": ["TRUNCATE TABLE", "DELETE FROM", "DROP TABLE", "REMOVE TABLE"],
            "correct_answer": "TRUNCATE TABLE",
            "explanation": "TRUNCATE quickly reallocates table storage pages and empties the table without logging row-by-row deletions.",
            "difficulty": "HARD",
        },
        {
            "question": "What is the purpose of an SQL transaction (BEGIN ... COMMIT)?",
            "options": [
                "Guarantees ACID properties: ensures multiple SQL operations succeed or fail as a single atomic unit",
                "Increases concurrency by removing all database locking",
                "Automatically archives past row states to object storage",
                "Enforces foreign key relationships during server restart",
            ],
            "correct_answer": "Guarantees ACID properties: ensures multiple SQL operations succeed or fail as a single atomic unit",
            "explanation": "Transactions ensure atomicity, consistency, isolation, and durability across data modifications.",
            "difficulty": "HARD",
        },
    ],
    "Git": [
        {
            "question": "Which Git command switches to another branch and updates files in your working directory?",
            "options": [
                "git checkout <branch> (or git switch <branch>)",
                "git pull <branch>",
                "git merge <branch>",
                "git branch -d <branch>",
            ],
            "correct_answer": "git checkout <branch> (or git switch <branch>)",
            "explanation": "git switch or git checkout moves HEAD to the specified branch and updates working files.",
            "difficulty": "EASY",
        },
        {
            "question": "What is the difference between `git merge` and `git rebase`?",
            "options": [
                "Merge creates a join commit combining histories; rebase replays commits onto another base to maintain a linear history",
                "Rebase preserves original commit timestamps whereas merge creates random commit hashes",
                "Merge permanently deletes feature branch commits",
                "Rebase is strictly only supported on remote bare repositories",
            ],
            "correct_answer": "Merge creates a join commit combining histories; rebase replays commits onto another base to maintain a linear history",
            "explanation": "git merge preserves complete branch topology with a merge commit; git rebase rewrites commit history on top of another base commit.",
            "difficulty": "MEDIUM",
        },
        {
            "question": "How do you discard uncommitted changes in a specific file in your Git working directory?",
            "options": [
                "git restore <file>",
                "git commit --amend",
                "git stash drop",
                "git rm --cached <file>",
            ],
            "correct_answer": "git restore <file>",
            "explanation": "git restore <file> discards unstaged working tree changes, reverting the file to the index state.",
            "difficulty": "EASY",
        },
        {
            "question": "What two operations does `git pull` perform by default?",
            "options": [
                "git fetch followed by git merge",
                "git clone followed by git checkout",
                "git push followed by git rebase",
                "git status followed by git commit",
            ],
            "correct_answer": "git fetch followed by git merge",
            "explanation": "git pull fetches changes from the upstream remote and merges them into the current active branch.",
            "difficulty": "MEDIUM",
        },
        {
            "question": "Which file specifies intentional untracked files that Git should ignore?",
            "options": [".gitignore", ".gitconfig", ".gitmodules", ".gitkeep"],
            "correct_answer": ".gitignore",
            "explanation": ".gitignore instructs Git to ignore files matching glob patterns (e.g. .env, node_modules/, __pycache__/).",
            "difficulty": "EASY",
        },
        {
            "question": "What does `git cherry-pick <commit-hash>` do?",
            "options": [
                "Applies the changes introduced by a specific existing commit onto the current branch as a new commit",
                "Deletes an unwanted commit from history",
                "Interactive visual diff of branch differences",
                "Tags a commit with a semantic version string",
            ],
            "correct_answer": "Applies the changes introduced by a specific existing commit onto the current branch as a new commit",
            "explanation": "git cherry-pick copies the diff of a specific commit and applies it to your current HEAD.",
            "difficulty": "HARD",
        },
    ],
    "DSA": [
        {
            "question": "What is the average-case time complexity of key lookup in a standard Hash Table (Python dict)?",
            "options": ["O(1)", "O(N)", "O(log N)", "O(N log N)"],
            "correct_answer": "O(1)",
            "explanation": "Hash tables compute array indices via hash functions, providing constant-time O(1) average lookup.",
            "difficulty": "EASY",
        },
        {
            "question": "What is the time complexity of Binary Search on a sorted array of size N?",
            "options": ["O(log N)", "O(N)", "O(1)", "O(N^2)"],
            "correct_answer": "O(log N)",
            "explanation": "Binary search halves the search space at each iteration, resulting in O(log N) logarithmic steps.",
            "difficulty": "EASY",
        },
        {
            "question": "Which data structure follows the Last-In, First-Out (LIFO) discipline?",
            "options": ["Stack", "Queue", "Binary Search Tree", "Linked List"],
            "correct_answer": "Stack",
            "explanation": "A stack inserts and removes elements from the same end (top), adhering to LIFO.",
            "difficulty": "EASY",
        },
        {
            "question": "What is the worst-case time complexity of standard QuickSort without randomized pivot selection?",
            "options": ["O(N^2)", "O(N log N)", "O(N)", "O(2^N)"],
            "correct_answer": "O(N^2)",
            "explanation": "When the chosen pivot consistently results in degenerate unbalanced partitions (e.g. already sorted array with first element as pivot), QuickSort degrades to O(N^2).",
            "difficulty": "MEDIUM",
        },
        {
            "question": "Which algorithmic technique uses two pointers moving inward from both ends of a sorted array to find a target sum?",
            "options": [
                "Two-Pointer Technique",
                "Sliding Window Algorithm",
                "Dynamic Programming",
                "Dijkstra Shortest Path",
            ],
            "correct_answer": "Two-Pointer Technique",
            "explanation": "The two-pointer technique achieves O(N) time without extra memory by advancing left or right pointers based on comparison with target.",
            "difficulty": "MEDIUM",
        },
        {
            "question": "What is the space complexity of Depth First Search (DFS) on a balanced binary tree of height H?",
            "options": ["O(H)", "O(2^H)", "O(1)", "O(N^2)"],
            "correct_answer": "O(H)",
            "explanation": "The call stack memory during DFS traversal corresponds to the maximum recursion depth, which is O(H) (or O(log N) for balanced trees).",
            "difficulty": "HARD",
        },
    ],
    "REST API": [
        {
            "question": "Which HTTP method is idempotent and conventionally used to replace an entire resource representation?",
            "options": ["PUT", "POST", "PATCH", "DELETE"],
            "correct_answer": "PUT",
            "explanation": "PUT replaces the resource completely and is idempotent (repeated identical PUT requests have the same side effect as a single request).",
            "difficulty": "EASY",
        },
        {
            "question": "What HTTP status code represents a successful resource creation?",
            "options": ["201 Created", "200 OK", "204 No Content", "202 Accepted"],
            "correct_answer": "201 Created",
            "explanation": "201 Created signifies that the request succeeded and led to the creation of a new resource.",
            "difficulty": "EASY",
        },
        {
            "question": "What HTTP status code should an API return when the client lacks valid authentication credentials?",
            "options": ["401 Unauthorized", "403 Forbidden", "404 Not Found", "400 Bad Request"],
            "correct_answer": "401 Unauthorized",
            "explanation": "401 Unauthorized indicates that the request requires HTTP authentication or the provided token is missing/invalid.",
            "difficulty": "EASY",
        },
        {
            "question": "What is the key architectural difference between PUT and PATCH in RESTful design?",
            "options": [
                "PUT replaces the entire entity; PATCH applies partial field-level updates",
                "PUT creates a resource; PATCH deletes it",
                "PATCH is idempotent whereas PUT is non-idempotent",
                "PUT only accepts URL query parameters",
            ],
            "correct_answer": "PUT replaces the entire entity; PATCH applies partial field-level updates",
            "explanation": "PUT sends a complete replacement payload; PATCH sends only the subset of fields intended for modification.",
            "difficulty": "MEDIUM",
        },
        {
            "question": "In standard OAuth2 / JWT authentication, where is the bearer token transmitted in an HTTP request?",
            "options": [
                "Authorization: Bearer <token> request header",
                "Cookie: jwt=<token> only",
                "URL query parameter ?token=<token> only",
                "Body JSON payload inside an 'auth' key only",
            ],
            "correct_answer": "Authorization: Bearer <token> request header",
            "explanation": "RFC 6750 specifies transmitting bearer tokens via the 'Authorization: Bearer <token>' HTTP header.",
            "difficulty": "MEDIUM",
        },
        {
            "question": "What HTTP response header indicates that the returned response body is formatted as JSON?",
            "options": [
                "Content-Type: application/json",
                "Accept: text/html",
                "Content-Encoding: gzip",
                "X-Payload-Format: json",
            ],
            "correct_answer": "Content-Type: application/json",
            "explanation": "Content-Type indicates the media type (MIME) of the response resource representation.",
            "difficulty": "EASY",
        },
    ],
}


async def seed_bkt_assessments_and_mastery(session: AsyncSession) -> Dict[str, int]:
    """
    Seeds competencies, assessment questions, diagnostic assessments,
    and initial BKT skill mastery records for candidate dossiers.
    """
    logger.info("Seeding BKT Skills, Assessments, and Question Bank...")

    # 1. Fetch or create the 6 core skills
    skill_map: Dict[str, Competency] = {}
    for skill_name in QUESTIONS_BY_SKILL.keys():
        stmt = select(Competency).where(Competency.name == skill_name)
        res = await session.execute(stmt)
        comp = res.scalar_one_or_none()
        if not comp:
            code_prefix = skill_name.upper().replace(" ", "-")
            comp = Competency(
                code=f"COMP-{code_prefix}",
                name=skill_name,
                sector="IT-ITeS",
                nqr_code=f"NQR-2026-IT-{code_prefix[:4]}",
            )
            session.add(comp)
            await session.flush()
        skill_map[skill_name] = comp

    # 2. Create Diagnostic Assessments
    assessment1 = Assessment(
        title="Full-Stack Software Engineering Diagnostic",
        code="ASSESS-FS-DEV-01",
        description="Comprehensive diagnostic assessment evaluating Python Basics, OOP, SQL, Git, DSA, and REST APIs.",
        sector="IT-ITeS",
        duration_minutes=35,
        is_active=True,
    )
    session.add(assessment1)

    assessment2 = Assessment(
        title="Python & Backend Data Diagnostic",
        code="ASSESS-BE-DATA-01",
        description="Targeted diagnostic assessing algorithmic problem solving, object oriented design, and SQL relational querying.",
        sector="IT-ITeS",
        duration_minutes=25,
        is_active=True,
    )
    session.add(assessment2)
    await session.flush()

    # 3. Seed Assessment Questions
    total_questions = 0
    all_question_entities: List[AssessmentQuestion] = []
    for skill_name, q_list in QUESTIONS_BY_SKILL.items():
        comp = skill_map[skill_name]
        for q_data in q_list:
            # Assign to assessment1 (and some to assessment2 as well)
            target_assess = assessment1 if total_questions % 3 != 0 else assessment2
            q_ent = AssessmentQuestion(
                assessment_id=target_assess.id,
                skill_id=comp.id,
                question_text=q_data["question"],
                options_json=json.dumps(q_data["options"]),
                correct_answer=q_data["correct_answer"],
                explanation=q_data["explanation"],
                difficulty=q_data["difficulty"],
                is_active=True,
            )
            session.add(q_ent)
            all_question_entities.append(q_ent)
            total_questions += 1

    await session.flush()
    logger.info(f"Seeded {total_questions} assessment questions across {len(QUESTIONS_BY_SKILL)} competency domains.")

    # 4. Seed realistic BKT Mastery States for the first 15 learners
    l_stmt = select(Learner).limit(15)
    l_res = await session.execute(l_stmt)
    learners = l_res.scalars().all()

    # Candidate 1 (Aarav Sharma / KN-2026-01001) gets the exact benchmark mastery pattern from the prompt
    # Python Basics: 0.82 (mastered), Python OOP: 0.54 (developing), SQL: 0.43 (developing),
    # Git: 0.31 (weak), DSA: 0.65 (proficient), REST API: 0.25 (weak)
    target_pattern = {
        "Python Basics": (0.82, 12, 10, 2),
        "Python OOP": (0.54, 8, 4, 4),
        "SQL": (0.43, 9, 4, 5),
        "Git": (0.31, 6, 2, 4),
        "DSA": (0.65, 14, 9, 5),
        "REST API": (0.25, 7, 2, 5),
    }

    mastery_count = 0
    now_dt = datetime.now(timezone.utc)

    for idx, learner in enumerate(learners):
        for s_name, comp in skill_map.items():
            if idx == 0 and s_name in target_pattern:
                m_prob, attempts, corrects, incorrects = target_pattern[s_name]
            else:
                # Randomize realistic profile
                attempts = random.randint(5, 15)
                m_prob = round(random.uniform(0.30, 0.88), 2)
                corrects = int(attempts * (m_prob * 0.9))
                incorrects = max(0, attempts - corrects)

            mastery = LearnerSkillMastery(
                learner_id=learner.id,
                skill_id=comp.id,
                mastery_probability=m_prob,
                questions_attempted=attempts,
                correct_answers=corrects,
                incorrect_answers=incorrects,
                last_assessed_at=now_dt - timedelta(days=random.randint(1, 14)),
            )
            session.add(mastery)
            mastery_count += 1

            # Seed 2 historical transitions for audit trail
            h1 = LearnerSkillHistory(
                learner_id=learner.id,
                skill_id=comp.id,
                question_id=all_question_entities[0].id,
                previous_mastery=0.30,
                is_correct=True,
                new_mastery=0.45,
                created_at=now_dt - timedelta(days=7),
            )
            h2 = LearnerSkillHistory(
                learner_id=learner.id,
                skill_id=comp.id,
                question_id=all_question_entities[1].id,
                previous_mastery=0.45,
                is_correct=m_prob >= 0.50,
                new_mastery=m_prob,
                created_at=now_dt - timedelta(days=2),
            )
            session.add(h1)
            session.add(h2)

    await session.flush()
    logger.info(f"Seeded {mastery_count} BKT skill mastery records and history audits.")

    return {
        "assessments": 2,
        "questions": total_questions,
        "masteries": mastery_count,
    }


async def main():
    """CLI runner to seed BKT data independently."""
    setup_logging()
    logger.info("Initializing standalone BKT data seeder...")
    async with AsyncSessionLocal() as session:
        # Clean existing BKT tables
        await session.execute(delete(AssessmentSubmission))
        await session.execute(delete(LearnerSkillHistory))
        await session.execute(delete(LearnerSkillMastery))
        await session.execute(delete(AssessmentQuestion))
        await session.execute(delete(Assessment))
        await session.commit()

        # Seed data
        stats = await seed_bkt_assessments_and_mastery(session)
        await session.commit()
        logger.info(f"Standalone BKT seeding completed successfully: {stats}")
    await dispose_engine()


if __name__ == "__main__":
    asyncio.run(main())

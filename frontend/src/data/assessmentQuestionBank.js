/**
 * NSQF & National Occupational Standards (NOS) Aligned MCQ Question Bank
 * Provides rich multi-domain diagnostic assessment items with pedagogical explanations,
 * difficulty levels, and competency mappings for Bayesian Knowledge Tracing (BKT).
 */

export const ASSESSMENT_DOMAINS = [
  {
    id: "fullstack",
    title: "Full-Stack Software Engineering",
    code: "NOS-IT-9820",
    sector: "IT-ITeS",
    nsqfLevel: "NSQF Level 6",
    description: "Evaluates React, REST APIs, Relational SQL, Git Versioning, and Data Structures.",
    icon: "Code2",
  },
  {
    id: "python",
    title: "Python & Data Engineering",
    code: "NOS-CS-4410",
    sector: "IT-ITeS",
    nsqfLevel: "NSQF Level 6",
    description: "Evaluates Python Core, OOP Architecture, Asynchronous Tasks, and Data Pipelines.",
    icon: "Terminal",
  },
  {
    id: "data",
    title: "Data Analytics & Power BI",
    code: "NOS-IT-9821",
    sector: "Analytics & BFSI",
    nsqfLevel: "NSQF Level 5",
    description: "Evaluates Power BI, DAX Modeling, SQL Aggregations, and Business Intelligence.",
    icon: "BarChart3",
  },
  {
    id: "manufacturing",
    title: "Precision Manufacturing & CNC",
    code: "NOS-MF-3390",
    sector: "Automotive & Heavy Eng",
    nsqfLevel: "NSQF Level 4",
    description: "Evaluates Multi-Axis CNC Milling, G-Code Scripting, GD&T, and Safety Protocols.",
    icon: "Cpu",
  },
  {
    id: "digital",
    title: "Performance Marketing Analytics",
    code: "NOS-MK-1205",
    sector: "Digital Economy & Services",
    nsqfLevel: "NSQF Level 4",
    description: "Evaluates Meta CAPI Server-Side Tracking, Google Tag Manager, and Attribution.",
    icon: "TrendingUp",
  },
  {
    id: "cad",
    title: "AutoCAD & BIM Modeling",
    code: "NOS-ME-7734",
    sector: "Construction & Infrastructure",
    nsqfLevel: "NSQF Level 5",
    description: "Evaluates Revit Parametric Families, BIM Coordination, and 3D Structural Drafting.",
    icon: "Layers",
  },
];

export const QUESTION_BANK = {
  fullstack: [
    {
      id: "fs-q1",
      skill_name: "REST API Design",
      competency_code: "NOS-IT-9820-API",
      difficulty: "EASY",
      question_text: "Which HTTP method is idempotent and conventionally used to completely replace an existing resource?",
      options: ["PUT", "POST", "PATCH", "DELETE"],
      correct_answer: "PUT",
      explanation: "PUT is idempotent and replaces the entire target resource with the requested payload, whereas POST creates new entities and PATCH applies partial modifications.",
    },
    {
      id: "fs-q2",
      skill_name: "React State Architecture",
      competency_code: "NOS-IT-9820-REACT",
      difficulty: "EASY",
      question_text: "What is the primary purpose of the `useEffect` hook in React functional components?",
      options: [
        "Handling side effects like data fetching, subscriptions, and DOM updates",
        "Directly mutating the component's inner DOM nodes synchronously",
        "Declaring global CSS class bindings across route boundaries",
        "Replacing the component rendering pipeline with WebGL shaders",
      ],
      correct_answer: "Handling side effects like data fetching, subscriptions, and DOM updates",
      explanation: "useEffect allows developers to coordinate imperative side effects (APIs, timers, manual subscriptions) synchronized with React's rendering lifecycle.",
    },
    {
      id: "fs-q3",
      skill_name: "SQL & Relational DBs",
      competency_code: "NOS-IT-9820-SQL",
      difficulty: "MEDIUM",
      question_text: "Which SQL clause is used to filter records aggregated by a `GROUP BY` statement?",
      options: ["HAVING", "WHERE", "ORDER BY", "FILTER"],
      correct_answer: "HAVING",
      explanation: "WHERE filters individual rows prior to grouping, while HAVING filters aggregated group results after GROUP BY evaluation.",
    },
    {
      id: "fs-q4",
      skill_name: "Git Version Control",
      competency_code: "NOS-IT-9820-GIT",
      difficulty: "MEDIUM",
      question_text: "What two underlying Git operations does `git pull origin main` execute by default?",
      options: [
        "git fetch followed by git merge",
        "git checkout followed by git commit",
        "git push followed by git rebase",
        "git clone followed by git reset",
      ],
      correct_answer: "git fetch followed by git merge",
      explanation: "git pull first fetches remote branch updates from the tracking remote repository, then immediately attempts to merge them into your checked-out local branch.",
    },
    {
      id: "fs-q5",
      skill_name: "Data Structures & Algorithms",
      competency_code: "NOS-IT-9820-DSA",
      difficulty: "EASY",
      question_text: "What is the average time complexity of key lookup in a standard Hash Table (or JavaScript object / Python dict)?",
      options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
      correct_answer: "O(1)",
      explanation: "Hash maps compute memory buckets via deterministic hash hashing functions, delivering constant-time O(1) average lookup and insertion.",
    },
    {
      id: "fs-q6",
      skill_name: "Web Security & Auth",
      competency_code: "NOS-IT-9820-SEC",
      difficulty: "MEDIUM",
      question_text: "Where is the most secure location to store JWT tokens in modern web applications to prevent cross-site scripting (XSS)?",
      options: [
        "An HttpOnly, Secure, SameSite cookie",
        "Browser localStorage variable",
        "URL query search parameters",
        "In a public global window JavaScript variable",
      ],
      correct_answer: "An HttpOnly, Secure, SameSite cookie",
      explanation: "HttpOnly cookies cannot be read or exfiltrated by client-side JavaScript, protecting tokens against XSS credential theft.",
    },
    {
      id: "fs-q7",
      skill_name: "Asynchronous JavaScript",
      competency_code: "NOS-IT-9820-ASYNC",
      difficulty: "HARD",
      question_text: "In the JavaScript Event Loop, which queue executes microtasks such as Promise callbacks and `queueMicrotask`?",
      options: [
        "The Microtask Queue, which drains immediately after the current script stack and before the next Macrotask",
        "The Macrotask Queue, which runs once per animation frame only",
        "The Garbage Collector Thread, which blocks worker threads",
        "The Network Thread, which executes asynchronously in OS kernel space",
      ],
      correct_answer: "The Microtask Queue, which drains immediately after the current script stack and before the next Macrotask",
      explanation: "Microtasks are drained completely at the end of each macro-turn, guaranteeing Promise continuations run before setTimeout, setInterval, or rendering updates.",
    },
    {
      id: "fs-q8",
      skill_name: "SQL & Relational DBs",
      competency_code: "NOS-IT-9820-SQL",
      difficulty: "HARD",
      question_text: "What does the ACID acronym stand for in database transaction management?",
      options: [
        "Atomicity, Consistency, Isolation, Durability",
        "Authentication, Cryptography, Integrity, Decryption",
        "Asynchronous, Concurrent, Indexed, Distributed",
        "Allocation, Compilation, Inversion, Deduplication",
      ],
      correct_answer: "Atomicity, Consistency, Isolation, Durability",
      explanation: "ACID guarantees that database transactions are processed reliably: all-or-nothing (Atomicity), valid state transitions (Consistency), concurrency isolation (Isolation), and committed persistence (Durability).",
    },
    {
      id: "fs-q9",
      skill_name: "REST API Design",
      competency_code: "NOS-IT-9820-API",
      difficulty: "EASY",
      question_text: "Which HTTP status code signifies that a resource was successfully created on the server?",
      options: ["201 Created", "200 OK", "204 No Content", "202 Accepted"],
      correct_answer: "201 Created",
      explanation: "201 Created explicitly confirms that the incoming POST request generated a persistent resource with an assigned URI.",
    },
    {
      id: "fs-q10",
      skill_name: "Data Structures & Algorithms",
      competency_code: "NOS-IT-9820-DSA",
      difficulty: "MEDIUM",
      question_text: "Which data structure operates on a Last-In, First-Out (LIFO) order?",
      options: ["Stack", "Queue", "Binary Heap", "Linked List"],
      correct_answer: "Stack",
      explanation: "A Stack restricts insertions and removals to a single end ('top'), enforcing the LIFO operational pattern.",
    },
  ],

  python: [
    {
      id: "py-q1",
      skill_name: "Python Basics",
      competency_code: "NOS-CS-4410-CORE",
      difficulty: "EASY",
      question_text: "What will `type([])` return in Python 3?",
      options: ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<class 'dict'>"],
      correct_answer: "<class 'list'>",
      explanation: "Square brackets instantiate a dynamic list object representing Python's native list class.",
    },
    {
      id: "py-q2",
      skill_name: "Python Basics",
      competency_code: "NOS-CS-4410-CORE",
      difficulty: "EASY",
      question_text: "What is the output of the list comprehension `[x**2 for x in range(4)]`?",
      options: ["[0, 1, 4, 9]", "[1, 4, 9, 16]", "[0, 1, 2, 3]", "[0, 2, 4, 6]"],
      correct_answer: "[0, 1, 4, 9]",
      explanation: "range(4) produces 0, 1, 2, 3. Squaring each element yields [0, 1, 4, 9].",
    },
    {
      id: "py-q3",
      skill_name: "Python OOP",
      competency_code: "NOS-CS-4410-OOP",
      difficulty: "MEDIUM",
      question_text: "What does the `@classmethod` decorator do when applied to a method in Python?",
      options: [
        "Binds the method to the class itself as its first argument (cls) rather than an instance (self)",
        "Makes the method execute as a separate background OS thread",
        "Forces static compilation into C bytecode via Cython",
        "Prevents the method from accessing any class attributes",
      ],
      correct_answer: "Binds the method to the class itself as its first argument (cls) rather than an instance (self)",
      explanation: "@classmethod receives the class object 'cls' rather than an instance 'self', commonly used for alternative constructors and class-level factories.",
    },
    {
      id: "py-q4",
      skill_name: "Python Basics",
      competency_code: "NOS-CS-4410-CORE",
      difficulty: "MEDIUM",
      question_text: "How do you safely extract a value from a dictionary with a fallback without raising KeyError?",
      options: ["dict.get(key, default)", "dict.fetch(key, default)", "dict.lookup(key, default)", "dict[key] || default"],
      correct_answer: "dict.get(key, default)",
      explanation: "dict.get returns the default fallback if the key is absent, avoiding unexpected KeyError exceptions.",
    },
    {
      id: "py-q5",
      skill_name: "Asynchronous Python",
      competency_code: "NOS-CS-4410-ASYNC",
      difficulty: "MEDIUM",
      question_text: "Which Python standard library module provides coroutines, event loops, and asynchronous I/O?",
      options: ["asyncio", "multiprocessing", "threading", "concurrent.futures"],
      correct_answer: "asyncio",
      explanation: "asyncio provides single-threaded non-blocking concurrency via coroutines and event-loop driven asynchronous tasks.",
    },
    {
      id: "py-q6",
      skill_name: "Python Memory & Architecture",
      competency_code: "NOS-CS-4410-CORE",
      difficulty: "HARD",
      question_text: "What is the Global Interpreter Lock (GIL) in CPython?",
      options: [
        "A mutex that prevents multiple native threads from executing Python bytecodes at once",
        "A hardware encryption module securing runtime memory heaps",
        "A database lock applied across all async queries automatically",
        "A security sandbox restricting unauthorized file system I/O",
      ],
      correct_answer: "A mutex that prevents multiple native threads from executing Python bytecodes at once",
      explanation: "The GIL protects CPython memory management and reference counting by ensuring only one thread executes Python bytecode at any single instant.",
    },
    {
      id: "py-q7",
      skill_name: "Data Engineering & Pandas",
      competency_code: "NOS-CS-4410-DATA",
      difficulty: "MEDIUM",
      question_text: "In Pandas, which method is best optimized to compute aggregate statistics grouped by categorical keys?",
      options: ["df.groupby('key').agg(...) ", "df.filter(...).sum()", "for loop iterating over df.iterrows()", "df.pivot_table() only"],
      correct_answer: "df.groupby('key').agg(...) ",
      explanation: "df.groupby with vectorized aggregation functions executes compiled C/Cython loops, offering massive performance advantages over Python iterrows.",
    },
    {
      id: "py-q8",
      skill_name: "Distributed Queues",
      competency_code: "NOS-CS-4410-ASYNC",
      difficulty: "HARD",
      question_text: "Which message broker is most commonly paired with Celery for distributed Python task execution?",
      options: ["Redis or RabbitMQ", "SQLite", "Local filesystem flat files", "Nginx web server"],
      correct_answer: "Redis or RabbitMQ",
      explanation: "Celery relies on high-throughput in-memory AMQP brokers like RabbitMQ or Redis to queue, distribute, and acknowledge background worker tasks.",
    },
    {
      id: "py-q9",
      skill_name: "Python OOP",
      competency_code: "NOS-CS-4410-OOP",
      difficulty: "EASY",
      question_text: "Which dunder method is executed when an object is instantiated in Python?",
      options: ["__init__", "__new__", "__construct__", "__start__"],
      correct_answer: "__init__",
      explanation: "__init__ acts as the initialization constructor method, configuring instance variables immediately following object creation.",
    },
    {
      id: "py-q10",
      skill_name: "Python Basics",
      competency_code: "NOS-CS-4410-CORE",
      difficulty: "EASY",
      question_text: "What block is guaranteed to execute in Python whether an unhandled exception occurred or not?",
      options: ["finally", "catch", "except", "ensure"],
      correct_answer: "finally",
      explanation: "The finally block always runs prior to exiting a try-except structure, guaranteeing resource cleanup like closing files or database sockets.",
    },
  ],

  data: [
    {
      id: "da-q1",
      skill_name: "Power BI & DAX",
      competency_code: "NOS-IT-9821-DAX",
      difficulty: "EASY",
      question_text: "What is DAX in the context of Power BI and SQL Server Analysis Services?",
      options: [
        "Data Analysis Expressions, a formula expression language for calculations and data modeling",
        "Direct Access XML, a protocol for exporting flat CSV records",
        "Database Accelerated eXecution, a hardware GPU acceleration driver",
        "Data Analytics Xerox, an automated report printing framework",
      ],
      correct_answer: "Data Analysis Expressions, a formula expression language for calculations and data modeling",
      explanation: "DAX (Data Analysis Expressions) is Microsoft's functional expression language designed for relational data aggregation and tabular data modeling.",
    },
    {
      id: "da-q2",
      skill_name: "Power BI & DAX",
      competency_code: "NOS-IT-9821-DAX",
      difficulty: "MEDIUM",
      question_text: "Which DAX function overrides the existing filter context applied to a data measure?",
      options: ["CALCULATE()", "FILTER()", "SUMX()", "RELATED()"],
      correct_answer: "CALCULATE()",
      explanation: "CALCULATE evaluates an expression in a modified filter context, making it the most fundamental and versatile calculation engine function in DAX.",
    },
    {
      id: "da-q3",
      skill_name: "SQL for Analytics",
      competency_code: "NOS-IT-9821-SQL",
      difficulty: "EASY",
      question_text: "Which SQL aggregate function counts only unique, non-repeating entries in a column?",
      options: ["COUNT(DISTINCT column_name)", "UNIQUE_COUNT(column_name)", "SUM(DISTINCT column_name)", "DISTINCT_ROWS(column_name)"],
      correct_answer: "COUNT(DISTINCT column_name)",
      explanation: "COUNT(DISTINCT column) tallies unique values, filtering out recurring duplicate instances across rows.",
    },
    {
      id: "da-q4",
      skill_name: "Data Modeling",
      competency_code: "NOS-IT-9821-MODEL",
      difficulty: "MEDIUM",
      question_text: "In dimensional data warehousing, what schema features a central Fact table connected directly to surrounding Dimension tables?",
      options: ["Star Schema", "Snowflake Schema", "Relational 3NF Schema", "Graph Schema"],
      correct_answer: "Star Schema",
      explanation: "A Star Schema organizes data with central quantitative Fact tables referenced directly by denormalized Dimension tables, optimizing analytics query speed.",
    },
    {
      id: "da-q5",
      skill_name: "SQL for Analytics",
      competency_code: "NOS-IT-9821-SQL",
      difficulty: "HARD",
      question_text: "What SQL window function calculates the ranking of rows without leaving gaps in ranking values for tied items?",
      options: ["DENSE_RANK()", "RANK()", "ROW_NUMBER()", "NTILE()"],
      correct_answer: "DENSE_RANK()",
      explanation: "DENSE_RANK() assigns contiguous integer ranks to ties (e.g. 1, 2, 2, 3), unlike RANK() which skips numbers following ties (e.g. 1, 2, 2, 4).",
    },
    {
      id: "da-q6",
      skill_name: "Statistical Methods",
      competency_code: "NOS-IT-9821-STAT",
      difficulty: "EASY",
      question_text: "Which measure of central tendency is least sensitive to extreme outliers in a skewed distribution?",
      options: ["Median", "Arithmetic Mean", "Standard Deviation", "Variance"],
      correct_answer: "Median",
      explanation: "The median reflects the physical 50th percentile rank value and is resilient against extreme skewed outliers, unlike the arithmetic mean.",
    },
    {
      id: "da-q7",
      skill_name: "Power BI & DAX",
      competency_code: "NOS-IT-9821-DAX",
      difficulty: "HARD",
      question_text: "What is the primary difference between a Calculated Column and a Measure in Power BI?",
      options: [
        "Calculated Columns are computed row-by-row during data refresh and stored in RAM; Measures are calculated dynamically on-the-fly based on visual filter context",
        "Measures can only be written in Python; Calculated Columns require SQL",
        "Calculated Columns consume zero storage memory; Measures store static pre-aggregated cubes",
        "Measures cannot be used in chart tooltips or KPI cards",
      ],
      correct_answer: "Calculated Columns are computed row-by-row during data refresh and stored in RAM; Measures are calculated dynamically on-the-fly based on visual filter context",
      explanation: "Calculated Columns occupy physical memory per row upon model refresh, whereas Measures are computed dynamically on demand in response to user slicing and filter contexts.",
    },
    {
      id: "da-q8",
      skill_name: "Data Visualization",
      competency_code: "NOS-IT-9821-VIZ",
      difficulty: "EASY",
      question_text: "Which chart type is best suited to display cumulative metric progression or retention trends across sequential time periods?",
      options: ["Line or Area Chart", "Pie Chart", "Scatter Plot", "Treemap"],
      correct_answer: "Line or Area Chart",
      explanation: "Continuous chronological trend analysis is most clearly communicated via line or area plots with time mapped to the horizontal X-axis.",
    },
    {
      id: "da-q9",
      skill_name: "Data Modeling",
      competency_code: "NOS-IT-9821-MODEL",
      difficulty: "MEDIUM",
      question_text: "Why are bidirectional cross-filter relationships in Power BI generally discouraged in large enterprise data models?",
      options: [
        "They can introduce ambiguous relationship paths, degrade query performance, and cause unexpected calculation results",
        "They make the report impossible to publish to the cloud",
        "They prevent DAX functions from running",
        "They automatically delete primary key constraints",
      ],
      correct_answer: "They can introduce ambiguous relationship paths, degrade query performance, and cause unexpected calculation results",
      explanation: "Bidirectional relationships propagate filters across multiple paths, causing performance bottlenecks and circular or ambiguous evaluation loops.",
    },
    {
      id: "da-q10",
      skill_name: "Data Warehousing",
      competency_code: "NOS-IT-9821-DW",
      difficulty: "EASY",
      question_text: "What does the ETL acronym represent in data processing pipelines?",
      options: ["Extract, Transform, Load", "Encrypt, Transmit, Lock", "Evaluate, Test, Launch", "Enterprise Telemetry Logger"],
      correct_answer: "Extract, Transform, Load",
      explanation: "ETL describes the fundamental pipeline of extracting raw source data, transforming it via cleaning/business rules, and loading it into analytical data stores.",
    },
  ],

  manufacturing: [
    {
      id: "mf-q1",
      skill_name: "CNC Machining & G-Code",
      competency_code: "NOS-MF-3390-GCODE",
      difficulty: "EASY",
      question_text: "In standard CNC G-code programming, which preparatory command instructs rapid non-cutting positioning?",
      options: ["G00", "G01", "G02", "G03"],
      correct_answer: "G00",
      explanation: "G00 initiates maximum rapid traverse to reposition the cutting tool above the workpiece without cutting material.",
    },
    {
      id: "mf-q2",
      skill_name: "CNC Machining & G-Code",
      competency_code: "NOS-MF-3390-GCODE",
      difficulty: "MEDIUM",
      question_text: "Which G-code command performs linear interpolation at a controlled cutting feed rate?",
      options: ["G01", "G00", "G04", "G90"],
      correct_answer: "G01",
      explanation: "G01 moves the tool along a straight trajectory at the feed rate specified by the F parameter.",
    },
    {
      id: "mf-q3",
      skill_name: "Metrology & GD&T",
      competency_code: "NOS-MF-3390-GDT",
      difficulty: "MEDIUM",
      question_text: "What does GD&T stand for in precision manufacturing and engineering drawing standards?",
      options: [
        "Geometric Dimensioning and Tolerancing",
        "General Drafting & Tooling",
        "Global Displacement & Torque",
        "Graduated Diameter & Thickness",
      ],
      correct_answer: "Geometric Dimensioning and Tolerancing",
      explanation: "GD&T defines the allowable variation in geometric characteristics (flatness, roundness, parallelism) on production blueprints.",
    },
    {
      id: "mf-q4",
      skill_name: "Safety & ISO Standards",
      competency_code: "NOS-MF-3390-SAFE",
      difficulty: "EASY",
      question_text: "What is the very first action an operator must take if a mechanical vibration or spindle crash occurs on a CNC machine?",
      options: [
        "Hit the physical Emergency Stop (E-Stop) button",
        "Open the safety enclosure door to inspect the tool",
        "Rewind the G-code program in memory",
        "Turn off the factory floor circuit breaker",
      ],
      correct_answer: "Hit the physical Emergency Stop (E-Stop) button",
      explanation: "Striking the emergency stop immediately cuts power to spindle drives and feed axes, preventing severe injury and equipment destruction.",
    },
    {
      id: "mf-q5",
      skill_name: "Multi-Axis Machining",
      competency_code: "NOS-MF-3390-5AXIS",
      difficulty: "HARD",
      question_text: "What are the two additional rotational axes on a standard 5-axis CNC machining center beyond X, Y, and Z?",
      options: [
        "A-axis (rotation around X) and B-axis (rotation around Y) or C-axis (around Z)",
        "U and V axes",
        "I and J arc centers",
        "W and Q offset axes",
      ],
      correct_answer: "A-axis (rotation around X) and B-axis (rotation around Y) or C-axis (around Z)",
      explanation: "5-axis machines supplement linear X, Y, Z coordinates with two rotational axes designated A (around X), B (around Y), or C (around Z).",
    },
  ],

  digital: [
    {
      id: "dm-q1",
      skill_name: "Server-Side Tracking & CAPI",
      competency_code: "NOS-MK-1205-CAPI",
      difficulty: "EASY",
      question_text: "What is the primary advantage of Meta Conversions API (CAPI) compared to standard client-side browser pixels?",
      options: [
        "Transmits event data directly from server to Meta, bypassing browser ad-blockers and cookie restrictions",
        "Eliminates the need for any campaign budget on ad platforms",
        "Automatically generates AI video ads for creative campaigns",
        "Bypasses GDPR privacy consent regulations completely",
      ],
      correct_answer: "Transmits event data directly from server to Meta, bypassing browser ad-blockers and cookie restrictions",
      explanation: "Server-to-server CAPI sends conversion payloads from backend infrastructure directly to Meta servers, ensuring telemetry resilience against browser ITP tracking caps.",
    },
    {
      id: "dm-q2",
      skill_name: "Google Tag Manager",
      competency_code: "NOS-MK-1205-GTM",
      difficulty: "MEDIUM",
      question_text: "What data structure in client-side code acts as the message bus between web applications and Google Tag Manager?",
      options: ["dataLayer array", "analyticsQueue object", "window.gtmStorage", "sessionStorage.tags"],
      correct_answer: "dataLayer array",
      explanation: "GTM monitors the window.dataLayer array for pushed custom events, variables, and ecommerce transactions.",
    },
    {
      id: "dm-q3",
      skill_name: "Attribution Modeling",
      competency_code: "NOS-MK-1205-ATTR",
      difficulty: "MEDIUM",
      question_text: "Which attribution model credits 100% of conversion value to the initial touchpoint where a user first encountered your brand?",
      options: ["First Click / First Touch", "Last Non-Direct Click", "Linear Attribution", "Time Decay"],
      correct_answer: "First Click / First Touch",
      explanation: "First-touch attribution assigns full conversion weight to the introductory interaction channel, prioritizing top-of-funnel acquisition discovery.",
    },
  ],

  cad: [
    {
      id: "cad-q1",
      skill_name: "BIM Coordination",
      competency_code: "NOS-ME-7734-BIM",
      difficulty: "EASY",
      question_text: "What does BIM stand for in modern architecture and construction engineering?",
      options: [
        "Building Information Modeling",
        "Basic Infrastructure Measurement",
        "Broadband Interior Mapping",
        "Building Inspection Methodology",
      ],
      correct_answer: "Building Information Modeling",
      explanation: "BIM (Building Information Modeling) is the coordinated 3D digital representation of physical and functional building characteristics.",
    },
    {
      id: "cad-q2",
      skill_name: "Revit Family Modeling",
      competency_code: "NOS-ME-7734-REVIT",
      difficulty: "MEDIUM",
      question_text: "What type of Autodesk Revit family is saved as an external `.rfa` file and loaded into projects on demand?",
      options: ["Loadable / Component Family", "System Family", "In-Place Family", "Drafting Family"],
      correct_answer: "Loadable / Component Family",
      explanation: "Loadable families (doors, windows, fixtures, equipment) exist as standalone .rfa files that can be versioned and loaded across projects.",
    },
    {
      id: "cad-q3",
      skill_name: "Clash Detection",
      competency_code: "NOS-ME-7734-CLASH",
      difficulty: "HARD",
      question_text: "Which software tool is industry standard for running automated 3D spatial clash detection across MEP, architectural, and structural BIM models?",
      options: ["Autodesk Navisworks", "Adobe Illustrator", "Microsoft Excel", "Google SketchUp Free"],
      correct_answer: "Autodesk Navisworks",
      explanation: "Navisworks coordinates multi-discipline federated BIM models to detect spatial interferences and constructability clashes prior to fabrication.",
    },
  ],
};

/**
 * Returns diagnostic questions for a given domain/role with balanced difficulty.
 */
export function getDomainQuestions(domainId = "fullstack", limit = 10) {
  const bank = QUESTION_BANK[domainId] || QUESTION_BANK.fullstack;
  if (!bank || bank.length === 0) return QUESTION_BANK.fullstack.slice(0, limit);

  // If the bank has fewer than limit questions, supplement with fullstack items
  if (bank.length < limit) {
    const supplement = QUESTION_BANK.fullstack.filter(
      (q) => !bank.some((bq) => bq.question_text === q.question_text)
    );
    return [...bank, ...supplement].slice(0, limit);
  }

  return bank.slice(0, limit);
}

/**
 * Simulates Bayesian Knowledge Tracing (BKT) update for a submission.
 * Returns updated skill masteries and overall readiness score.
 */
export function simulateBKTUpdate(questions, answersMap) {
  const skillStats = {};

  questions.forEach((q) => {
    const skill = q.skill_name || "General Competency";
    if (!skillStats[skill]) {
      skillStats[skill] = {
        total: 0,
        correct: 0,
        competency_code: q.competency_code,
        prior: 0.35, // P(L0)
      };
    }
    skillStats[skill].total += 1;
    const isCorrect = answersMap[q.id] === q.correct_answer;
    if (isCorrect) {
      skillStats[skill].correct += 1;
    }
  });

  const pTransit = 0.15; // P(T)
  const pSlip = 0.10;    // P(S)
  const pGuess = 0.20;   // P(G)

  let totalQuestions = questions.length;
  let correctCount = 0;

  const masteries = Object.entries(skillStats).map(([skillName, stats]) => {
    let pL = stats.prior;

    // Run iterative BKT updates for each question in this skill
    for (let i = 0; i < stats.total; i++) {
      const observation = i < stats.correct;
      if (observation) {
        // Correct answer update
        const pObs = (pL * (1 - pSlip)) / (pL * (1 - pSlip) + (1 - pL) * pGuess);
        pL = pObs + (1 - pObs) * pTransit;
      } else {
        // Incorrect answer update
        const pObs = (pL * pSlip) / (pL * pSlip + (1 - pL) * (1 - pGuess));
        pL = pObs + (1 - pObs) * pTransit;
      }
    }

    correctCount += stats.correct;

    const posterior = Math.min(0.98, Math.max(0.08, parseFloat(pL.toFixed(3))));

    return {
      skill_name: skillName,
      competency_code: stats.competency_code,
      prior_mastery: stats.prior,
      posterior_mastery: posterior,
      questions_answered: stats.total,
      questions_correct: stats.correct,
      is_mastered: posterior >= 0.75,
      status: posterior >= 0.80 ? "Mastered" : posterior >= 0.60 ? "Proficient" : "Needs Focus",
    };
  });

  const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = scorePercentage >= 60;
  const readinessScore = Math.min(96, Math.max(45, Math.round(50 + scorePercentage * 0.45)));

  return {
    score_percentage: scorePercentage,
    total_questions: totalQuestions,
    correct_answers: correctCount,
    passed: passed,
    readiness_score: readinessScore,
    updated_masteries: masteries,
    evaluated_at: new Date().toISOString(),
  };
}
from abc import ABC, abstractmethod
import re
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from src.core.logging import logger


class SkillEmbeddingService(ABC):
    """
    Abstract Interface for Skill Competency Vectorization and Semantic Matching.
    Enables decoupling of the matching engine from specific NLP/vectorizer implementations.
    """

    @abstractmethod
    def fit(self, corpus: Optional[List[str]] = None) -> None:
        """Fit or fine-tune embedding vectorizer on a domain skill vocabulary."""
        pass

    @abstractmethod
    def embed_skills(self, skills: List[str]) -> np.ndarray:
        """Converts a collection of skill strings into dense numerical embedding vectors."""
        pass

    @abstractmethod
    def compute_similarity(self, candidate_skills: List[str], required_skills: List[str]) -> float:
        """Computes composite cosine similarity score (0.0 to 1.0) between two skill profiles."""
        pass

    @abstractmethod
    def extract_matched_and_missing(
        self,
        candidate_skills: List[str],
        required_skills: List[str],
        threshold: float = 0.40,
    ) -> Tuple[List[str], List[str], List[float]]:
        """
        Calculates semantic match mapping for each required skill.
        Returns: (matched_skills, missing_skills, similarity_scores_per_requirement)
        """
        pass

    @abstractmethod
    def get_metadata(self) -> Dict[str, Any]:
        """Returns ML model versioning metadata and disclaimers."""
        pass


class TfidfSkillEmbeddingService(SkillEmbeddingService):
    """
    scikit-learn TF-IDF N-Gram based semantic skill embedding service.
    
    Trained on national skilling taxonomies (NCVET, NSQF, IT-ITeS, Manufacturing, Renewable Energy).
    NOTE: Uses mock/demo taxonomic vocabulary for prototyping.
    """

    DEFAULT_SKILL_CORPUS = [
        # IT & Cloud
        "Python for Data Analytics",
        "Python Data Science Stack pandas numpy scikit-learn",
        "SQL Relational Database PostgreSQL MySQL Query Optimization",
        "React.js Frontend UI Component State Management Tailwind CSS",
        "TypeScript Strict Mode JavaScript Fullstack",
        "Cloud Engineering AWS Core Services EC2 S3 Lambda CloudFormation",
        "Linux SysAdmin Shell Bash Scripting Server Maintenance",
        "Docker Containerization Kubernetes Microservices DevOps CI CD",
        "REST APIs Fastapi Node.js Backend Microservices Architecture",
        "Power BI Dashboarding DAX Business Intelligence Analytics",
        "Machine Learning AI Predictive Modeling Data Pipeline",
        "Cybersecurity Network Defense Penetration Testing Incident Response",
        # Smart Manufacturing & Automotive
        "CNC Precision Machining Multi Axis Milling Lathe Operations",
        "Industrial Automation PLC SCADA Sensor Diagnostics Robotics",
        "CAD CAM SolidWorks AutoCAD Mechanical Engineering Modeling",
        "Electric Vehicle EV Battery Diagnostics BMS Calibration Thermal Management",
        "Welding Arc TIG MIG Fabrication Industrial Metallurgy Safety",
        "Quality Control Six Sigma Metrology ISO Standards Assurance",
        # Renewable Energy & Electronics
        "Solar Photovoltaic PV Rooftop Panel Installation Grid Inverter",
        "Electrical Wiring Circuit Troubleshooting Single Phase Three Phase",
        # Healthcare & BFSI
        "Clinical Data Management Healthcare Informatics Medical Records",
        "Financial Accounting GST TDS Balance Sheet Tally ERP Banking",
        "Core Technical Lab Proficiency Industrial Safety Workplace Ergonomics",
    ]

    def __init__(self, vocabulary_corpus: Optional[List[str]] = None) -> None:
        self.model_name = "KaushalNexus-SkillEmbedding-TFIDF"
        self.version = "0.2.1-prototype"
        self.algorithm = "TF-IDF N-Gram Vectorizer (1,2) with Cosine Similarity"
        self.disclaimer = (
            "Prototype ML skill matching model trained on synthetic national qualification corpora. "
            "Demonstrates semantic skill distance and gap detection; not certified as production ground truth."
        )
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            lowercase=True,
            strip_accents="unicode",
            token_pattern=r"(?u)\b\w+\b",
        )
        self.is_fitted = False
        self.fit(vocabulary_corpus or self.DEFAULT_SKILL_CORPUS)

    def fit(self, corpus: Optional[List[str]] = None) -> None:
        """Fits TF-IDF vocabulary on domain skills."""
        data = corpus if corpus is not None else self.DEFAULT_SKILL_CORPUS
        if not data:
            data = self.DEFAULT_SKILL_CORPUS

        self.vectorizer.fit(data)
        self.is_fitted = True
        logger.info(
            f"Fitted {self.model_name} [v{self.version}] on {len(data)} domain competency profiles. "
            f"Vocabulary feature dimension: {len(self.vectorizer.vocabulary_)}"
        )

    def embed_skills(self, skills: List[str]) -> np.ndarray:
        """Vectorizes skills into sparse/dense TF-IDF embedding matrix."""
        if not self.is_fitted:
            self.fit()

        if not skills:
            # Return zero vector with matching dimension
            dim = len(self.vectorizer.vocabulary_)
            return np.zeros((1, dim), dtype=np.float32)

        combined_text = [" ".join(skills)]
        return self.vectorizer.transform(combined_text).toarray()

    def _compute_pairwise_score(self, candidate_str: str, required_str: str) -> float:
        """Computes combined TF-IDF cosine and semantic token overlap score between two skill strings."""
        if not candidate_str or not required_str:
            return 0.0

        cand_lower = candidate_str.lower().strip()
        req_lower = required_str.lower().strip()

        if cand_lower == req_lower:
            return 1.0
        if cand_lower in req_lower or req_lower in cand_lower:
            return 0.95

        # 1. TF-IDF Cosine Similarity
        cv = self.vectorizer.transform([candidate_str]).toarray()
        rv = self.vectorizer.transform([required_str]).toarray()
        cos_sim = float(cosine_similarity(cv, rv)[0, 0])

        # 2. Key Term / Token Jaccard Overlap
        stopwords = {"for", "and", "with", "in", "of", "to", "the", "a", "an", "on", "using"}
        cand_tokens = {w for w in re.findall(r"\b\w+\b", cand_lower) if w not in stopwords and len(w) > 1}
        req_tokens = {w for w in re.findall(r"\b\w+\b", req_lower) if w not in stopwords and len(w) > 1}

        overlap = cand_tokens.intersection(req_tokens)
        token_sim = 0.0
        if overlap and req_tokens:
            token_sim = len(overlap) / len(req_tokens)

        # Composite score
        composite = max(cos_sim, (token_sim * 0.85) + (cos_sim * 0.15))
        return round(float(np.clip(composite, 0.0, 1.0)), 3)

    def compute_similarity(self, candidate_skills: List[str], required_skills: List[str]) -> float:
        """
        Computes composite cosine and soft-Jaccard semantic similarity between
        candidate competency profile and mandate required skills.
        """
        if not required_skills:
            return 1.0
        if not candidate_skills:
            return 0.0

        scores: List[float] = []
        for req in required_skills:
            best_score = 0.0
            for cs in candidate_skills:
                score = self._compute_pairwise_score(cs, req)
                if score > best_score:
                    best_score = score
            scores.append(best_score)

        return round(float(np.mean(scores)), 3)

    def extract_matched_and_missing(
        self,
        candidate_skills: List[str],
        required_skills: List[str],
        threshold: float = 0.35,
    ) -> Tuple[List[str], List[str], List[float]]:
        """
        Evaluates each individual required skill against candidate competencies
        using semantic TF-IDF and domain token matching.
        """
        if not required_skills:
            return ["General Industry Competencies"], [], [1.0]

        if not candidate_skills:
            return [], list(required_skills), [0.0] * len(required_skills)

        matched: List[str] = []
        missing: List[str] = []
        scores: List[float] = []

        for req in required_skills:
            best_sim = 0.0
            for cs in candidate_skills:
                score = self._compute_pairwise_score(cs, req)
                if score > best_sim:
                    best_sim = score

            score_normalized = round(float(np.clip(best_sim, 0.0, 1.0)), 2)
            scores.append(score_normalized)

            if score_normalized >= threshold:
                matched.append(req)
            else:
                missing.append(req)

        return matched, missing, scores

    def get_metadata(self) -> Dict[str, Any]:
        """Returns model metadata and parameters."""
        return {
            "model_name": self.model_name,
            "version": self.version,
            "algorithm": self.algorithm,
            "vocabulary_size": len(self.vectorizer.vocabulary_) if self.is_fitted else 0,
            "disclaimer": self.disclaimer,
            "is_production_ready": False,
        }


# Global singleton instance
skill_embedding_service: SkillEmbeddingService = TfidfSkillEmbeddingService()

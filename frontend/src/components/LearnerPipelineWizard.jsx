import React, { useState, useEffect, useCallback } from "react";
import {
  User,
  FileText,
  Target,
  BrainCircuit,
  BarChart3,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Upload,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Building,
  Calendar,
  ExternalLink,
  Loader2,
  TrendingUp,
  Cpu,
  Layers,
  ChevronRight,
  Clock,
  Code2,
  RefreshCw,
  ShieldCheck,
  Award,
} from "lucide-react";

import { learnerPipelineApi } from "../api/learnerPipeline";
import { assessmentsApi } from "../api/assessments";
import { getErrorMessage } from "../api/client";
import BKTSkillMasteryCard from "./BKTSkillMasteryCard";

const STEPS = [
  { id: 1, title: "Candidate Profile", short: "Profile", icon: User },
  { id: 2, title: "Resume Upload & Skills", short: "Resume", icon: FileText },
  { id: 3, title: "Aspiring Target Role", short: "Target Role", icon: Target },
  { id: 4, title: "Diagnostic Assessment", short: "Assessment", icon: BrainCircuit },
  { id: 5, title: "BKT Knowledge State", short: "Knowledge", icon: BarChart3 },
  { id: 6, title: "Skill Gap & Matching", short: "Matching", icon: Sparkles },
  { id: 7, title: "ML Feature Pipeline", short: "ML Features", icon: Cpu },
];

export default function LearnerPipelineWizard({ onProfileUpdated, onOpenRemediation }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Core Pipeline States
  const [profile, setProfile] = useState(null);
  const [resume, setResume] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submissionResult, setSubmissionResult] = useState(null);
  const [bktSkills, setBktSkills] = useState([]);
  const [roleMatches, setRoleMatches] = useState(null);
  const [mlFeatures, setMlFeatures] = useState(null);

  // Resume Upload State
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form State for Profile
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    education_level: "",
    institution: "",
    graduation_year: 2026,
    experience_years: 0.0,
    bio: "",
    github_url: "",
    linkedin_url: "",
  });

  // Load initial candidate profile and roles
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch current profile
      const prof = await learnerPipelineApi.getMyProfile();
      setProfile(prof);
      setProfileForm({
        full_name: prof.full_name || "",
        phone: prof.phone || "",
        education_level: prof.education_level || "",
        institution: prof.institution || "",
        graduation_year: prof.graduation_year || 2026,
        experience_years: prof.experience_years || 0.0,
        bio: prof.bio || "",
        github_url: prof.github_url || "",
        linkedin_url: prof.linkedin_url || "",
      });

      // 2. Fetch available roles
      const rolesList = await learnerPipelineApi.listRoles();
      setRoles(rolesList || []);

      if (prof.aspiring_role_id) {
        const found = rolesList.find((r) => r.id === prof.aspiring_role_id);
        setSelectedRole(found || null);
      }

      // 3. Check for active resume
      try {
        const rData = await learnerPipelineApi.getMyResume();
        setResume(rData);
      } catch (err) {
        // No active resume is fine
      }

      // 4. Fetch available assessments
      try {
        const aList = await assessmentsApi.listAssessments();
        setAssessments(aList || []);
        if (aList && aList.length > 0) {
          const detail = await assessmentsApi.getAssessmentById(aList[0].id);
          setCurrentAssessment(detail);
        }
      } catch (err) {
        console.warn("Could not load assessments:", err);
      }
    } catch (err) {
      console.error("Pipeline initialization error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // STEP 1: Save Profile
  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const updated = await learnerPipelineApi.updateMyProfile({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        education_level: profileForm.education_level,
        institution: profileForm.institution,
        graduation_year: parseInt(profileForm.graduation_year) || 2026,
        experience_years: parseFloat(profileForm.experience_years) || 0.0,
        bio: profileForm.bio,
        github_url: profileForm.github_url,
        linkedin_url: profileForm.linkedin_url,
      });
      setProfile(updated);
      showNotification("Profile details saved successfully!");
      if (onProfileUpdated) onProfileUpdated();
      setCurrentStep(2);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // STEP 2: Handle Resume Upload
  const handleResumeUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError("Please select a valid PDF or Word document.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      const parsedResume = await learnerPipelineApi.uploadResume(uploadFile);
      setResume(parsedResume);
      setUploadFile(null);
      showNotification(`Resume parsed: detected ${parsedResume.skills_count} skills & ${parsedResume.projects?.length || 0} projects!`);
      // Refresh profile to reflect readiness boost
      const prof = await learnerPipelineApi.getMyProfile();
      setProfile(prof);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  // STEP 3: Choose Aspiring Role
  const handleSelectRole = async (role) => {
    try {
      setSaving(true);
      setError(null);
      await learnerPipelineApi.setMyAspiringRole(role.id);
      setSelectedRole(role);
      showNotification(`Aspiring role set to ${role.title}! Generating your assessment...`);
      const prof = await learnerPipelineApi.getMyProfile();
      setProfile(prof);

      // Auto-generate role-specific MCQ assessment
      try {
        const generatedAssessment = await assessmentsApi.generateForRole(role.id);
        setCurrentAssessment(generatedAssessment);
        setAnswers({});
        showNotification(
          `Assessment generated: ${generatedAssessment.questions?.length || 0} MCQs covering ${role.title} competencies!`
        );
      } catch (genErr) {
        console.warn("Could not generate role assessment, falling back:", genErr);
        // Fallback: try to match from existing assessments
        if (assessments && assessments.length > 0) {
          const titleLower = (role.title || "").toLowerCase();
          const matched = assessments.find((a) => {
            const aTitle = (a.title || "").toLowerCase();
            if (titleLower.includes("python") || titleLower.includes("data")) {
              return aTitle.includes("python") || aTitle.includes("data");
            }
            return aTitle.includes("software") || aTitle.includes("full-stack") || aTitle.includes("web");
          });
          if (matched) {
            const detail = await assessmentsApi.getAssessmentById(matched.id);
            setCurrentAssessment(detail);
            setAnswers({});
          }
        }
      }

      setCurrentStep(4);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAssessment = async (assessId) => {
    try {
      setSaving(true);
      const detail = await assessmentsApi.getAssessmentById(assessId);
      setCurrentAssessment(detail);
      setAnswers({});
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // STEP 4: Handle Diagnostic Assessment Submission
  const handleAnswerSelect = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmitAssessment = async () => {
    if (!currentAssessment) return;
    try {
      setSaving(true);
      setError(null);

      const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
        question_id: qId,
        selected_answer: ans,
      }));

      if (formattedAnswers.length === 0) {
        setError("Please answer at least one question before submitting.");
        return;
      }

      const result = await assessmentsApi.submitAssessment(currentAssessment.id, {
        learner_id: profile.id,
        answers: formattedAnswers,
      });

      setSubmissionResult(result);
      showNotification(`Assessment completed! Score: ${result.score_percentage}%`);

      // Refresh BKT knowledge state
      const skillsResp = await learnerPipelineApi.getMySkills();
      setBktSkills(skillsResp?.skills || []);

      setCurrentStep(5);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // STEP 5: View Knowledge State & Proceed to Matching
  const handleProceedToMatching = async () => {
    try {
      setSaving(true);
      const matches = await learnerPipelineApi.getMyRoleMatches();
      setRoleMatches(matches);
      setCurrentStep(6);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // STEP 6: Proceed to ML Features
  const handleProceedToML = async () => {
    try {
      setSaving(true);
      const feat = await learnerPipelineApi.getMyBktFeatures();
      setMlFeatures(feat);
      setCurrentStep(7);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white/50 p-8 dark:border-slate-800 dark:bg-slate-900/50">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
          Initializing Learner Intelligence Pipeline...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Wizard Stepper */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between overflow-x-auto py-2">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isDone = s.id < currentStep;
            const isCurrent = s.id === currentStep;

            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(s.id)}
                  className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    isCurrent
                      ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                      : isDone
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                      isCurrent
                        ? "bg-white/20 text-white"
                        : isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={13} /> : <Icon size={13} />}
                  </div>
                  <span className="hidden whitespace-nowrap sm:inline">{s.title}</span>
                  <span className="inline whitespace-nowrap sm:hidden">{s.short}</span>
                </button>

                {idx < STEPS.length - 1 && (
                  <div className="mx-1 h-0.5 w-6 bg-slate-200 dark:bg-slate-800 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900 shadow-xs dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 shadow-xs dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* STEP 1: CANDIDATE PROFILE */}
      {currentStep === 1 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  STAGE 1 / 7
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Candidate Profile & Background
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Maintain your candidate dossier, contact credentials, and verified institution.
              </p>
            </div>
            <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-800/60 sm:block">
              <span className="block text-[10px] font-mono text-slate-400">BENEFICIARY ID</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {profile?.id}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Educational Institution / College
                </label>
                <input
                  type="text"
                  value={profileForm.institution}
                  onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })}
                  placeholder="e.g. Government Polytechnic Varanasi"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Highest Degree / Qualification
                </label>
                <input
                  type="text"
                  value={profileForm.education_level}
                  onChange={(e) => setProfileForm({ ...profileForm, education_level: e.target.value })}
                  placeholder="e.g. B.Tech Computer Science"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Graduation Year
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2035"
                  value={profileForm.graduation_year}
                  onChange={(e) => setProfileForm({ ...profileForm, graduation_year: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Prior Experience (Years)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={profileForm.experience_years}
                  onChange={(e) => setProfileForm({ ...profileForm, experience_years: e.target.value })}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GitHub Profile URL
                </label>
                <input
                  type="url"
                  value={profileForm.github_url}
                  onChange={(e) => setProfileForm({ ...profileForm, github_url: e.target.value })}
                  placeholder="https://github.com/your-handle"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  value={profileForm.linkedin_url}
                  onChange={(e) => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/your-profile"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Professional Bio & Technical Summary
              </label>
              <textarea
                rows={3}
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                placeholder="Brief summary of your skilling focus, interests, and engineering passion..."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-sky-500 disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                <span>Save Profile & Continue</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: RESUME UPLOAD & PARSING */}
      {currentStep === 2 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                STAGE 2 / 7
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Resume Upload & Candidate Skill Extraction
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Upload your CV (PDF or Word, max 5MB). Our parser extracts prior candidate evidence and normalizes technologies against the national competency standard.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Upload Zone */}
            <div className="lg:col-span-5">
              <form onSubmit={handleResumeUpload} className="space-y-4">
                <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition-colors hover:border-sky-400 dark:border-slate-700 dark:bg-slate-800/40">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                    <Upload size={22} />
                  </div>
                  <h4 className="mt-3 text-xs font-bold text-slate-800 dark:text-slate-200">
                    Choose PDF or DOCX File
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Maximum size: 5.0 MB
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  {uploadFile && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-mono text-sky-600 shadow-xs dark:bg-slate-800 dark:text-sky-400">
                      <FileText size={13} />
                      <span className="truncate max-w-[200px]">{uploadFile.name}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-sky-500 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Parsing CV & Normalizing Skills...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Upload & Extract Skills</span>
                    </>
                  )}
                </button>
              </form>

              {/* Safety Disclaimers */}
              <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-[11px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-bold">BKT Latent Isolation: </span>
                    Resume skills are candidate self-assertions and prior evidence. They are strictly NOT written to certified Bayesian Knowledge Tracing (BKT) mastery states.
                  </div>
                </div>
              </div>
            </div>

            {/* Parsed Output Display */}
            <div className="lg:col-span-7">
              {resume ? (
                <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 p-5 dark:border-slate-800 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Active Resume: {resume.filename}
                      </span>
                      <span className="ml-2 text-[10px] text-slate-400 font-mono">
                        ({Math.round(resume.file_size_bytes / 1024)} KB)
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 size={11} />
                      Parsed
                    </span>
                  </div>

                  {/* Skills Cloud */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Extracted Candidate Skills ({resume.skills?.length || 0})
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {resume.skills?.map((sk) => (
                        <div
                          key={sk.id}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <span className="font-medium">{sk.raw_skill_text}</span>
                          {sk.competency_code && (
                            <span className="rounded bg-sky-100 px-1 py-0.2 text-[9px] font-mono font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                              {sk.competency_code}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {Math.round(sk.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Projects List */}
                  {resume.projects && resume.projects.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Extracted Projects ({resume.projects.length})
                      </span>
                      <div className="mt-2 space-y-2">
                        {resume.projects.map((pr) => (
                          <div
                            key={pr.id}
                            className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                          >
                            <div className="font-bold text-slate-900 dark:text-white">
                              {pr.title}
                            </div>
                            {pr.description && (
                              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                                {pr.description}
                              </p>
                            )}
                            {pr.technologies && (
                              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-mono text-sky-600 dark:text-sky-400">
                                <Code2 size={11} />
                                <span>{pr.technologies}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 dark:border-slate-800">
                  <FileText size={24} className="text-slate-300 dark:text-slate-600" />
                  <p className="mt-2">No active resume uploaded yet.</p>
                  <p className="text-[11px] text-slate-500">Upload your CV to auto-extract technical competencies.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft size={14} />
              <span>Back to Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-sky-500"
            >
              <span>Continue to Target Role</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ASPIRING TARGET ROLE */}
      {currentStep === 3 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                STAGE 3 / 7
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Select Your Target Aspiring Role
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Pick your goal occupation standard. The Bayesian Knowledge Tracing engine and skill gap analyzer will benchmark your diagnostics against these requirements.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {roles.map((r) => {
              const isSelected = selectedRole?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectRole(r)}
                  className={`group cursor-pointer rounded-2xl border p-5 transition-all ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/50 shadow-md ring-2 ring-sky-500/20 dark:bg-sky-950/20"
                      : "border-slate-200/90 bg-white hover:border-sky-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                      <Target size={18} />
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 rounded-full bg-sky-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                        <CheckCircle2 size={11} /> Target Selected
                      </span>
                    )}
                  </div>
                  <h4 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                    {r.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {r.description || "Industry accredited apprenticeship and internship curriculum track."}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{r.sector}</span>
                    <span>{r.total_requirements || 5} Required Skills</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft size={14} />
              <span>Back to Resume</span>
            </button>
            <button
              type="button"
              disabled={!selectedRole}
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-sky-500 disabled:opacity-50"
            >
              <span>Take Diagnostic Assessment</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DIAGNOSTIC ASSESSMENT */}
      {currentStep === 4 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                STAGE 4 / 7
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Diagnostic Assessment & Bayesian Tracing
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Target Role: <strong className="text-sky-600 dark:text-sky-400">{selectedRole?.title || "Python Developer"}</strong>
              {currentAssessment && (
                <span className="ml-2 text-slate-400">
                  — {currentAssessment.questions?.length || 0} MCQs
                  {currentAssessment.description && (
                    <span className="ml-1 text-[11px]">({currentAssessment.description})</span>
                  )}
                </span>
              )}
            </p>
          </div>

          {/* Test Switcher Pills */}
          {assessments && assessments.length > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Select Test:
              </span>
              {assessments.map((a) => {
                const isActive = currentAssessment?.id === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleSelectAssessment(a.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-sky-600 text-white shadow-xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <BrainCircuit size={13} className={isActive ? "text-white" : "text-sky-500"} />
                    <span>{a.title}</span>
                    <span
                      className={`ml-1 rounded px-1.5 py-0.2 text-[10px] font-mono ${
                        isActive
                          ? "bg-sky-700 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {a.total_questions || 10} Qs
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {currentAssessment && currentAssessment.questions?.length > 0 ? (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                {currentAssessment.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        {q.skill_name || "Technical Competency"}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        Difficulty: {q.difficulty}
                      </span>
                    </div>
                    <h4 className="mt-2 text-xs font-semibold text-slate-900 dark:text-white">
                      Q{idx + 1}. {q.question_text}
                    </h4>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {q.options?.map((opt, oIdx) => {
                        const isChosen = answers[q.id] === opt;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleAnswerSelect(q.id, opt)}
                            className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-xs font-medium transition-all ${
                              isChosen
                                ? "border-sky-500 bg-sky-50 text-sky-900 font-semibold dark:bg-sky-950/50 dark:text-sky-200"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                isChosen
                                  ? "bg-sky-500 text-white"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Roles</span>
                </button>
                <button
                  type="button"
                  disabled={saving || Object.keys(answers).length === 0}
                  onClick={handleSubmitAssessment}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-sky-500 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Applying BKT Equations...</span>
                    </>
                  ) : (
                    <>
                      <BrainCircuit size={14} />
                      <span>Submit & Update BKT State</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center py-12 text-center text-xs text-slate-500">
              <BrainCircuit size={32} className="text-slate-300 dark:text-slate-600" />
              <p className="mt-2 font-medium">No diagnostic tests currently ready.</p>
              <button
                type="button"
                onClick={handleProceedToMatching}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white"
              >
                <span>Proceed Directly to Knowledge State</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: BKT KNOWLEDGE STATE & LATENT MASTERY */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  STAGE 5 / 7
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bayesian Knowledge Tracing (BKT) Knowledge State
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Latent mastery probability $P(L_t)$ estimated from sequential assessment observation.
              </p>
            </div>

            {submissionResult && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                <div className="flex items-center justify-between font-bold">
                  <span>Diagnostic Assessment Score: {submissionResult.score_percentage}%</span>
                  <span>{submissionResult.correct_count} / {submissionResult.total_questions} Correct</span>
                </div>
              </div>
            )}

            <div className="mt-6">
              <BKTSkillMasteryCard learnerId={profile.id} />
            </div>

            <div className="mt-6 flex justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <ArrowLeft size={14} />
                <span>Back to Assessment</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleProceedToMatching}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-sky-500"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                <span>Calculate Skill Gaps & Role Matches</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: SKILL GAP & ROLE MATCHING */}
      {currentStep === 6 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                STAGE 6 / 7
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Skill Gap Engine & Deterministic Role Matching
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Evaluates current certified BKT masteries against role requirements. Computed match scores and prioritized competency deficits.
            </p>
          </div>

          {roleMatches && (
            <div className="mt-6 space-y-6">
              {/* Aspiring Role Match Spotlight */}
              {roleMatches.aspiring_role && (
                <div className="rounded-2xl border-2 border-sky-500/40 bg-gradient-to-br from-sky-50/60 to-indigo-50/40 p-6 dark:from-sky-950/20 dark:to-indigo-950/20">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="rounded-md bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        Aspiring Goal Match
                      </span>
                      <h4 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {roleMatches.aspiring_role.role_title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Sector: {roleMatches.aspiring_role.sector}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="block text-[11px] font-mono text-slate-500">MATCH ALIGNMENT</span>
                        <span className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
                          {roleMatches.aspiring_role.match_score}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/30">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        Strong Skills ({roleMatches.aspiring_role.strong_skills?.length || 0})
                      </span>
                      <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                        {roleMatches.aspiring_role.strong_skills?.join(", ") || "None yet"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs dark:border-amber-900/60 dark:bg-amber-950/30">
                      <span className="font-bold text-amber-800 dark:text-amber-300">
                        Developing ({roleMatches.aspiring_role.development_skills?.length || 0})
                      </span>
                      <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                        {roleMatches.aspiring_role.development_skills?.join(", ") || "None"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs dark:border-rose-900/60 dark:bg-rose-950/30">
                      <span className="font-bold text-rose-800 dark:text-rose-300">
                        Critical Gaps ({roleMatches.aspiring_role.critical_gaps?.length || 0})
                      </span>
                      <div className="mt-1 text-[11px] text-rose-700 dark:text-rose-400">
                        {roleMatches.aspiring_role.critical_gaps?.join(", ") || "None"}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Requirements Table */}
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                        <tr>
                          <th className="py-2.5 px-3">Competency</th>
                          <th className="py-2.5 px-3 text-center">BKT Current</th>
                          <th className="py-2.5 px-3 text-center">Target Req</th>
                          <th className="py-2.5 px-3 text-center">Deficit</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                        {roleMatches.aspiring_role.skill_details?.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                              {d.skill_name}
                              <span className="ml-1 text-[10px] text-slate-400 font-mono">({d.competency_code})</span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {Math.round(d.current_mastery * 100)}%
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-500">
                              {Math.round(d.required_mastery * 100)}%
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-rose-600 dark:text-rose-400">
                              {d.gap > 0 ? `-${Math.round(d.gap * 100)}%` : "0%"}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  d.status === "mastered"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : d.status === "critical_gap"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                }`}
                              >
                                {d.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {onOpenRemediation && (
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-sky-300/80 bg-sky-500/10 p-4 dark:border-sky-800/80 dark:bg-sky-950/40">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
                          <BrainCircuit size={18} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            Adaptive Remediation Loop Available (Phase 3)
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            Prerequisite-aware learning path, targeted reassessment drills, and dynamic BKT convergence for your gaps.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenRemediation}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-500 transition-all cursor-pointer"
                      >
                        <span>Launch Adaptive Plan</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Other Matched Roles */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Top Recommended Industry Roles
                </h4>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {roleMatches.top_matches?.map((m) => (
                    <div
                      key={m.role_id}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {m.role_title}
                        </span>
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {m.match_score}%
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        {m.strong_skills?.length || 0} strong · {m.critical_gaps?.length || 0} gaps
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft size={14} />
              <span>Back to Knowledge State</span>
            </button>
            <div className="flex items-center gap-2.5">
              {onOpenRemediation && (
                <button
                  type="button"
                  onClick={onOpenRemediation}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/60"
                >
                  <BrainCircuit size={14} />
                  <span>Adaptive Learning Plan</span>
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={handleProceedToML}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-sky-500"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                <span>Inspect XGBoost Feature Pipeline</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 7: ML FEATURE PIPELINE */}
      {currentStep === 7 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                STAGE 7 / 7
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                XGBoost-Ready ML Tabular Feature Vector
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Zero data leakage guaranteed: Feature vector strictly extracted using pre-outcome BKT masteries, assessments, resume evidence, and target role alignment.
            </p>
          </div>

          {mlFeatures && (
            <div className="mt-6 space-y-6">
              {/* Leakage Guarantee Alert */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 text-xs text-purple-900 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-200">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={16} className="shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
                  <div>
                    <span className="font-bold">Strict Leakage-Free Boundary: </span>
                    {mlFeatures.leakage_guarantee} Features represent the candidate state strictly prior to career outcome milestones.
                  </div>
                </div>
              </div>

              {/* Tabular Feature Key-Value Grid */}
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Extracted Tabular Feature Values ({mlFeatures.feature_names?.length || 0})
                </span>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 font-mono text-xs">
                  {mlFeatures.feature_names?.map((fname) => (
                    <div
                      key={fname}
                      className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <span className="text-slate-600 dark:text-slate-400 truncate mr-2" title={fname}>
                        {fname}
                      </span>
                      <span className="font-bold text-sky-600 dark:text-sky-400">
                        {mlFeatures.features[fname]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1D Float Array Representation */}
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Direct XGBoost DMatrix Array Representation
                </span>
                <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                  [{mlFeatures.feature_vector?.join(", ")}]
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(6)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft size={14} />
              <span>Back to Role Matching</span>
            </button>
            <button
              type="button"
              onClick={() => showNotification("Learner Intelligence Pipeline Complete! Feature vector ready for inference.")}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500"
            >
              <CheckCircle2 size={14} />
              <span>Complete Pipeline</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

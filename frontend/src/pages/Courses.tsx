import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import apiClient from '../config/axios';
import { Plus, Search, Edit2, Trash2, X, ChevronDown, ChevronRight, BookOpen, Layers, PlayCircle, FileText } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  lessonType: string;
  durationMinutes: number | null;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  durationHours: number | null;
  modules?: Module[];
}

export const Courses: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Dialogs
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

  // Form states
  const [isEditCourse, setIsEditCourse] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseShortDesc, setCourseShortDesc] = useState('');
  const [courseDiff, setCourseDiff] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('BEGINNER');
  const [courseDuration, setCourseDuration] = useState<number>(40);

  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<'VIDEO' | 'PDF' | 'TEXT'>('VIDEO');
  const [lessonDuration, setLessonDuration] = useState<number>(15);

  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/courses', {
        params: { search: search || undefined },
      });
      setCourses(res.data.data || []);
    } catch (err) {
      console.error('Failed to load courses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [search]);

  const loadCourseDetails = async (courseId: string) => {
    try {
      const res = await apiClient.get(`/courses/${courseId}`);
      const courseData = res.data.data;
      setSelectedCourse(courseData);
      setModules(courseData.modules || []);
    } catch (err) {
      console.error('Failed to load course details', err);
    }
  };

  const handleCreateCourse = () => {
    setIsEditCourse(false);
    setCourseTitle('');
    setCourseShortDesc('');
    setCourseDiff('BEGINNER');
    setCourseDuration(40);
    setError(null);
    setIsCourseModalOpen(true);
  };

  const handleEditCourse = (c: Course) => {
    setIsEditCourse(true);
    setCourseTitle(c.title);
    setCourseShortDesc(c.shortDescription || '');
    setCourseDiff(c.difficulty);
    setCourseDuration(c.durationHours || 40);
    setError(null);
    setIsCourseModalOpen(true);
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle) {
      setError('Title is required');
      return;
    }

    const payload = {
      title: courseTitle,
      shortDescription: courseShortDesc || null,
      difficulty: courseDiff,
      durationHours: Number(courseDuration),
    };

    try {
      if (isEditCourse && selectedCourse) {
        await apiClient.put(`/courses/${selectedCourse.id}`, payload);
      } else {
        await apiClient.post('/courses', payload);
      }
      setIsCourseModalOpen(false);
      fetchCourses();
      if (selectedCourse) {
        loadCourseDetails(selectedCourse.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save course');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await apiClient.delete(`/courses/${id}`);
      setSelectedCourse(null);
      fetchCourses();
    } catch (err) {
      console.error('Failed to delete course', err);
    }
  };

  const toggleModule = (modId: string) => {
    setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  // Module actions
  const handleAddModule = () => {
    setModuleTitle('');
    setModuleDesc('');
    setError(null);
    setIsModuleModalOpen(true);
  };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (!moduleTitle) {
      setError('Module title is required');
      return;
    }

    try {
      await apiClient.post(`/courses/${selectedCourse.id}/modules`, {
        title: moduleTitle,
        description: moduleDesc || null,
        sortOrder: modules.length + 1,
      });
      setIsModuleModalOpen(false);
      loadCourseDetails(selectedCourse.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add module');
    }
  };

  const handleDeleteModule = async (modId: string) => {
    if (!window.confirm('Are you sure you want to delete this module?')) return;
    try {
      await apiClient.delete(`/courses/modules/${modId}`);
      if (selectedCourse) {
        loadCourseDetails(selectedCourse.id);
      }
    } catch (err) {
      console.error('Failed to delete module', err);
    }
  };

  // Lesson actions
  const handleAddLesson = (modId: string) => {
    setSelectedModuleId(modId);
    setLessonTitle('');
    setLessonType('VIDEO');
    setLessonDuration(15);
    setError(null);
    setIsLessonModalOpen(true);
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId || !selectedCourse) return;
    if (!lessonTitle) {
      setError('Lesson title is required');
      return;
    }

    try {
      await apiClient.post(`/courses/modules/${selectedModuleId}/lessons`, {
        title: lessonTitle,
        lessonType,
        durationMinutes: Number(lessonDuration),
        sortOrder: 100, // appends at the end
      });
      setIsLessonModalOpen(false);
      loadCourseDetails(selectedCourse.id);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add lesson');
    }
  };

  const handleDeleteLesson = async (lesId: string) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await apiClient.delete(`/courses/lessons/${lesId}`);
      if (selectedCourse) {
        loadCourseDetails(selectedCourse.id);
      }
    } catch (err) {
      console.error('Failed to delete lesson', err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left panel - Courses List */}
      <div className="lg:col-span-1 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-wide">COURSES BUILDER</h2>
          {isSuperAdmin && (
            <button
              onClick={handleCreateCourse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-semibold text-xs hover:shadow-[0_0_15px_rgba(0,210,255,0.3)] transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-brand/40"
          />
        </div>

        {/* Course Cards */}
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-10">
              <div className="w-6 h-6 border-2 border-brand/20 border-t-brand rounded-full animate-spin mx-auto"></div>
            </div>
          ) : courses.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">No courses found.</p>
          ) : (
            courses.map((c) => (
              <div
                key={c.id}
                onClick={() => loadCourseDetails(c.id)}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  selectedCourse?.id === c.id
                    ? 'bg-brand/10 border-brand/40 shadow-[0_0_15px_rgba(0,210,255,0.1)]'
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    c.status === 'PUBLISHED'
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                  }`}>
                    {c.status}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                    {c.difficulty}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-2 line-clamp-1">{c.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.shortDescription || 'No description provided.'}</p>
                <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-500">
                  <span>{c.durationHours ? `${c.durationHours} Hours` : 'N/A'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel - Course Builder Workspace */}
      <div className="lg:col-span-2">
        {selectedCourse ? (
          <div className="glow-card rounded-2xl p-6 border border-white/5 bg-slate-950/40 space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-white/5 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{selectedCourse.title}</h3>
                  <span className="text-xs text-slate-500 font-mono">({selectedCourse.slug})</span>
                </div>
                <p className="text-xs text-slate-400">{selectedCourse.shortDescription}</p>
                <div className="flex gap-3 text-xs font-semibold text-brand pt-1">
                  <span>Difficulty: {selectedCourse.difficulty}</span>
                  <span>•</span>
                  <span>Duration: {selectedCourse.durationHours} Hours</span>
                </div>
              </div>

              {isSuperAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditCourse(selectedCourse)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-brand/10 text-xs font-semibold text-slate-300 hover:text-brand transition-all"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(selectedCourse.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-red-950/20 text-xs font-semibold text-slate-300 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modules and syllabus workspace */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-brand uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4.5 h-4.5" />
                  <span>Course syllabus ({modules.length} Modules)</span>
                </h4>
                {isSuperAdmin && (
                  <button
                    onClick={handleAddModule}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-brand/10 text-xs font-bold text-slate-300 hover:text-brand transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Module</span>
                  </button>
                )}
              </div>

              {modules.length === 0 ? (
                <div className="border border-dashed border-white/10 rounded-xl p-8 text-center bg-white/[0.01]">
                  <p className="text-sm text-slate-500">No modules added yet. Create modules to build your syllabus.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modules.map((m) => {
                    const isExpanded = !!expandedModules[m.id];
                    return (
                      <div key={m.id} className="border border-white/5 rounded-xl bg-white/[0.01] overflow-hidden">
                        {/* Module Row header */}
                        <div className="p-4 flex items-center justify-between hover:bg-white/[0.01] cursor-pointer transition-colors select-none" onClick={() => toggleModule(m.id)}>
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-brand" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                            <div>
                              <h5 className="text-sm font-bold text-white">{m.title}</h5>
                              <p className="text-[10px] text-slate-500 font-semibold">{m.lessons?.length || 0} Lessons</p>
                            </div>
                          </div>
                          {isSuperAdmin && (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleAddLesson(m.id)}
                                className="px-2 py-0.5 rounded bg-brand/10 hover:bg-brand/20 text-brand text-[10px] font-bold border border-brand/25"
                              >
                                + Add Lesson
                              </button>
                              <button
                                onClick={() => handleDeleteModule(m.id)}
                                className="p-1 rounded bg-white/5 hover:bg-red-950/20 text-slate-400 hover:text-red-400 border border-white/10"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Lessons expandable list */}
                        {isExpanded && (
                          <div className="bg-black/20 border-t border-white/5 divide-y divide-white/5 px-4 py-2">
                            {(!m.lessons || m.lessons.length === 0) ? (
                              <p className="text-xs text-slate-500 py-3 text-center">No lessons in this module.</p>
                            ) : (
                              m.lessons.map((l) => (
                                <div key={l.id} className="flex items-center justify-between py-2.5">
                                  <div className="flex items-center gap-2">
                                    {l.lessonType === 'VIDEO' ? (
                                      <PlayCircle className="w-3.5 h-3.5 text-brand" />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                    <span className="text-xs font-semibold text-slate-300">{l.title}</span>
                                    <span className="text-[9px] font-bold text-slate-500">
                                      {l.durationMinutes ? `(${l.durationMinutes}m)` : ''}
                                    </span>
                                  </div>
                                  {isSuperAdmin && (
                                    <button
                                      onClick={() => handleDeleteLesson(l.id)}
                                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-all"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-[60vh] flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-white/[0.01] p-10 text-center">
            <BookOpen className="w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-md font-bold text-white">No Course Selected</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">Choose a course from the list on the left to see modules, upload syllabus materials, and customize lessons.</p>
          </div>
        )}
      </div>

      {/* Course Creation/Edit Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/90 relative animate-in zoom-in-95 duration-150">
            <button onClick={() => setIsCourseModalOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">
              {isEditCourse ? 'EDIT COURSE META' : 'CREATE NEW COURSE'}
            </h3>

            {error && (
              <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleCourseSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Course Title</label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g. Master React in 30 Days"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Short Description</label>
                <textarea
                  value={courseShortDesc}
                  onChange={(e) => setCourseShortDesc(e.target.value)}
                  rows={2}
                  placeholder="A quick overview of what the course covers"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Difficulty</label>
                  <select
                    value={courseDiff}
                    onChange={(e: any) => setCourseDiff(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none focus:border-brand/40 text-sm bg-slate-900"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Duration (Hours)</label>
                  <input
                    type="number"
                    value={courseDuration}
                    onChange={(e) => setCourseDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)] transition-all hover:shadow-[0_0_25px_rgba(0,210,255,0.3)]"
              >
                {isEditCourse ? 'SAVE CHANGES' : 'CREATE COURSE'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Module Modal */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/90 relative animate-in zoom-in-95 duration-150">
            <button onClick={() => setIsModuleModalOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">ADD MODULE</h3>

            {error && <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center">{error}</div>}

            <form onSubmit={handleModuleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Module Title</label>
                <input
                  type="text"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="e.g. Chapter 1: Introduction to Frameworks"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Description</label>
                <textarea
                  value={moduleDesc}
                  onChange={(e) => setModuleDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)]"
              >
                CREATE MODULE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 glow-card rounded-2xl border border-white/5 bg-slate-950/90 relative animate-in zoom-in-95 duration-150">
            <button onClick={() => setIsLessonModalOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6">ADD LESSON</h3>

            {error && <div className="p-3 mb-5 text-sm text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-center">{error}</div>}

            <form onSubmit={handleLessonSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Lesson Title</label>
                <input
                  type="text"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Setting up node modules"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-brand/40 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Lesson Type</label>
                  <select
                    value={lessonType}
                    onChange={(e: any) => setLessonType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-slate-300 focus:outline-none focus:border-brand/40 text-sm bg-slate-900"
                  >
                    <option value="VIDEO">Video</option>
                    <option value="PDF">PDF Document</option>
                    <option value="TEXT">Text Material</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Duration (Mins)</label>
                  <input
                    type="number"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-brand/40 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-dark to-brand-electric text-white font-bold text-sm tracking-wide shadow-[0_0_15px_rgba(0,210,255,0.2)]"
              >
                CREATE LESSON
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;

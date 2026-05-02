import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import AppSidebar from '../components/AppSidebar'
import { useAuth } from '../context/AuthContext'

const STATUS_OPTS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' }
]

const SECTION_HEADINGS = {
  overview: 'Overview',
  projects: 'Projects & team',
  tasks: isAdmin => (isAdmin ? 'Tasks' : 'My tasks')
}

const DashboardPage = () => {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [activeSection, setActiveSection] = useState('overview')
  const [dashboard, setDashboard] = useState({
    totalTasks: 0,
    status: { pending: 0, in_progress: 0, completed: 0 },
    overdue: 0
  })
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [projectForm, setProjectForm] = useState({ name: '', description: '' })
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    projectId: '',
    assignedTo: '',
    dueDate: '',
    status: 'pending'
  })
  const [memberForm, setMemberForm] = useState({ projectId: '', userId: '', role: 'member' })
  const [inviteQuery, setInviteQuery] = useState('')
  const [inviteResults, setInviteResults] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeProjectTab, setActiveProjectTab] = useState('')

  const membersForTaskProject = useMemo(() => {
    const p = projects.find(x => x._id === taskForm.projectId)
    if (!p) return []
    return p.members
      .filter(m => !m.status || m.status === 'active')
      .map(m => m.user)
      .filter(Boolean)
  }, [projects, taskForm.projectId])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [dashRes, projRes, taskRes] = await Promise.all([
      api.get('/tasks/dashboard'),
      api.get('/projects'),
      api.get('/tasks')
    ])
    setDashboard(dashRes.data)
    setProjects(projRes.data)
    setTasks(taskRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    setError('')
    loadData().catch(err => {
      setLoading(false)
      setError(err.response?.data?.message || err.message || 'Failed to load')
    })
  }, [loadData])

  useEffect(() => {
    const q = inviteQuery.trim()
    if (!isAdmin || q.length < 2) {
      setInviteResults([])
      return
    }
    const id = window.setTimeout(() => {
      api
        .get('/users/search', { params: { q } })
        .then(r => setInviteResults(r.data))
        .catch(() => setInviteResults([]))
    }, 300)
    return () => window.clearTimeout(id)
  }, [inviteQuery, isAdmin])

  useEffect(() => {
    if (projects.length === 0) {
      setActiveProjectTab('')
      return
    }
    setActiveProjectTab(prev => (prev && projects.some(p => String(p._id) === String(prev)) ? prev : projects[0]._id))
  }, [projects])

  const activeProject = useMemo(
    () => projects.find(p => String(p._id) === String(activeProjectTab)) ?? projects[0] ?? null,
    [projects, activeProjectTab]
  )

  /** True if assignee is soft-removed from this task's project (still on roster). */
  const isAssigneeRemovedFromTaskProject = useCallback(
    task => {
      const projectId = task.project?._id ?? task.project
      const assigneeId = task.assignedTo?._id ?? task.assignedTo
      if (!projectId || !assigneeId) return false
      const project = projects.find(pr => String(pr._id) === String(projectId))
      const entry = project?.members?.find(mem => String(mem.user?._id ?? mem.user) === String(assigneeId))
      return entry?.status === 'removed'
    },
    [projects]
  )

  const createProject = async e => {
    e.preventDefault()
    await api.post('/projects', projectForm)
    setProjectForm({ name: '', description: '' })
    await loadData()
  }

  const createTask = async e => {
    e.preventDefault()
    await api.post('/tasks', {
      ...taskForm,
      dueDate: new Date(taskForm.dueDate).toISOString()
    })
    setTaskForm({
      title: '',
      description: '',
      projectId: '',
      assignedTo: '',
      dueDate: '',
      status: 'pending'
    })
    await loadData()
  }

  const addMember = async e => {
    e.preventDefault()
    await api.post(`/projects/${memberForm.projectId}/members`, {
      userId: memberForm.userId,
      role: memberForm.role
    })
    setMemberForm({ projectId: '', userId: '', role: 'member' })
    setInviteQuery('')
    setInviteResults([])
    await loadData()
  }

  const removeMember = async (projectId, userId) => {
    await api.delete(`/projects/${projectId}/members/${userId}`)
    await loadData()
  }

  const updateStatus = async (taskId, status) => {
    await api.patch(`/tasks/${taskId}/status`, { status })
    await loadData()
  }

  const pickInvite = u => {
    setMemberForm(f => ({ ...f, userId: u.id }))
    setInviteQuery(u.email)
    setInviteResults([])
  }

  const mainTitle =
    activeSection === 'tasks'
      ? SECTION_HEADINGS.tasks(isAdmin)
      : SECTION_HEADINGS[activeSection]

  return (
    <div className="app-shell">
      <AppSidebar
        user={user}
        isAdmin={isAdmin}
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onLogout={logout}
      />

      <div className="main-shell">
        <header className="main-header">
          <h1 className="main-title">{mainTitle}</h1>
          <p className="muted small main-subtitle">
            {activeSection === 'overview' && 'Summary of your workload'}
            {activeSection === 'projects' && 'Project spaces and membership'}
            {activeSection === 'tasks' && (isAdmin ? 'Create assignments and track progress' : 'Update status on tasks assigned to you')}
          </p>
        </header>

        <main className="main-content">
          {error && (
            <div className="banner error" role="alert">
              {error}
            </div>
          )}
          {loading && <p className="muted">Loading…</p>}

          {activeSection === 'overview' && (
            <section className="stats" aria-label="Summary">
              <article className="stat">
                <span className="stat-label">Total tasks</span>
                <strong className="stat-value">{dashboard.totalTasks}</strong>
              </article>
              <article className="stat pending">
                <span className="stat-label">Pending</span>
                <strong className="stat-value">{dashboard.status.pending}</strong>
              </article>
              <article className="stat progress">
                <span className="stat-label">In progress</span>
                <strong className="stat-value">{dashboard.status.in_progress}</strong>
              </article>
              <article className="stat done">
                <span className="stat-label">Completed</span>
                <strong className="stat-value">{dashboard.status.completed}</strong>
              </article>
              <article className="stat overdue">
                <span className="stat-label">Overdue</span>
                <strong className="stat-value">{dashboard.overdue}</strong>
              </article>
            </section>
          )}

          {activeSection === 'projects' && (
            <>
              {isAdmin && (
                <section className="section section--tight-top">
                  <h2 className="section-title visually-hidden">Admin tools</h2>
                  <div className="split">
                    <form className="panel" onSubmit={createProject}>
                      <h3>New project</h3>
                      <label className="field">
                        <span>Name</span>
                        <input
                          required
                          value={projectForm.name}
                          onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
                          placeholder="E.g. E-commerce Website"
                        />
                      </label>
                      <label className="field">
                        <span>Description</span>
                        <textarea
                          rows={3}
                          value={projectForm.description}
                          onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                          placeholder="Optional"
                        />
                      </label>
                      <button type="submit" className="btn primary">
                        Create project
                      </button>
                    </form>

                    <form className="panel" onSubmit={addMember}>
                      <h3>Add team member</h3>
                      <label className="field">
                        <span>Project</span>
                        <select
                          required
                          value={memberForm.projectId}
                          onChange={e => setMemberForm({ ...memberForm, projectId: e.target.value })}
                        >
                          <option value="">Choose project…</option>
                          {projects.map(p => (
                            <option key={p._id} value={p._id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Find user by email</span>
                        <input
                          value={inviteQuery}
                          onChange={e => setInviteQuery(e.target.value)}
                          placeholder="Search email…"
                          autoComplete="off"
                        />
                      </label>
                      {inviteResults.length > 0 && (
                        <ul className="suggestions">
                          {inviteResults.map(u => (
                            <li key={u.id}>
                              <button type="button" className="linkish" onClick={() => pickInvite(u)}>
                                {u.name} — {u.email}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {memberForm.userId ? (
                        <p className="muted small">
                          Selected user id · <code>{memberForm.userId}</code>
                        </p>
                      ) : null}
                      <label className="field">
                        <span>Project role</span>
                        <select value={memberForm.role} onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}>
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                      <button type="submit" className="btn primary" disabled={!memberForm.userId}>
                        Add to project
                      </button>
                    </form>
                  </div>
                </section>
              )}

              <section className="section">
                <h2 className="section-title">Your projects</h2>
                {projects.length === 0 ? (
                  <p className="muted">No projects yet.</p>
                ) : (
                  <div className="project-tabs-shell">
                    <div className="project-tablist" role="tablist" aria-label="Projects">
                      {projects.map(p => {
                        const selected = String(p._id) === String(activeProjectTab)
                        return (
                          <button
                            key={p._id}
                            type="button"
                            role="tab"
                            id={`project-tab-${p._id}`}
                            aria-selected={selected}
                            aria-controls={`project-panel-${p._id}`}
                            tabIndex={selected ? 0 : -1}
                            className={`project-tab ${selected ? 'project-tab--active' : ''}`}
                            onClick={() => setActiveProjectTab(p._id)}
                          >
                            {p.name}
                          </button>
                        )
                      })}
                    </div>

                    {activeProject ? (
                      <div
                        className="project-tab-panel"
                        role="tabpanel"
                        id={`project-panel-${activeProject._id}`}
                        aria-labelledby={`project-tab-${activeProject._id}`}
                      >
                        <div className="project-tab-panel-head">
                          <div>
                            <h3 className="project-tab-panel-title">{activeProject.name}</h3>
                            <p className="muted small">{activeProject.description || 'No description'}</p>
                          </div>
                        </div>
                        {!isAdmin && activeProject.myMembershipStatus === 'removed' ? (
                          <div className="banner removed-access" role="status">
                            <strong>Removed from this team.</strong> You stay listed below as <em>Removed</em>. All project access
                            is frozen—you cannot see or update tasks for this project. An admin can add you again to restore access.
                          </div>
                        ) : null}
                        <h4 className="subhead project-team-heading">Team</h4>
                        <div className="table-wrap team-table-wrap">
                          <table className="tasks-table team-table">
                            <thead>
                              <tr>
                                <th>Member</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Team status</th>
                                <th>Owner</th>
                                {isAdmin ? <th>Actions</th> : null}
                              </tr>
                            </thead>
                            <tbody>
                              {activeProject.members.map(m => {
                                const isOwner = String(activeProject.owner) === String(m.user._id)
                                const isRemoved = m.status === 'removed'
                                return (
                                  <tr
                                    key={`${activeProject._id}-${m.user._id}`}
                                    className={isRemoved ? 'member-row--removed' : undefined}
                                  >
                                    <td>
                                      <strong>{m.user.name}</strong>
                                    </td>
                                    <td>{m.user.email}</td>
                                    <td>
                                      <span className="tag">{m.role}</span>
                                    </td>
                                    <td>
                                      {isRemoved ? (
                                        <span className="tag tag-removed">Removed</span>
                                      ) : (
                                        <span className="tag tag-active">Active</span>
                                      )}
                                    </td>
                                    <td>{isOwner ? <span className="tag owner">Owner</span> : <span className="muted">—</span>}</td>
                                    {isAdmin ? (
                                      <td>
                                        {!isOwner && !isRemoved ? (
                                          <button
                                            type="button"
                                            className="btn danger sm"
                                            onClick={() => removeMember(activeProject._id, m.user._id)}
                                          >
                                            Remove
                                          </button>
                                        ) : (
                                          <span className="muted small">—</span>
                                        )}
                                      </td>
                                    ) : null}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              {!isAdmin && (
                <p className="hint muted">
                  Team changes are handled by admins. Use <strong>Tasks</strong> in the sidebar to update your assignments.
                </p>
              )}
            </>
          )}

          {activeSection === 'tasks' && (
            <>
              {isAdmin && (
                <section className="section section--tight-top">
                  <h2 className="section-title">Assign a task</h2>
                  <form className="panel task-form" onSubmit={createTask}>
                    <div className="form-grid">
                      <label className="field span-2">
                        <span>Title</span>
                        <input
                          required
                          value={taskForm.title}
                          onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                        />
                      </label>
                      <label className="field span-2">
                        <span>Description</span>
                        <textarea
                          rows={2}
                          value={taskForm.description}
                          onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                        />
                      </label>
                      <label className="field">
                        <span>Project</span>
                        <select
                          required
                          value={taskForm.projectId}
                          onChange={e => setTaskForm({ ...taskForm, projectId: e.target.value, assignedTo: '' })}
                        >
                          <option value="">Choose…</option>
                          {projects.map(p => (
                            <option key={p._id} value={p._id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Assign to</span>
                        <select
                          required
                          value={taskForm.assignedTo}
                          onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                        >
                          <option value="">Choose…</option>
                          {membersForTaskProject.map(m => (
                            <option key={m._id} value={m._id}>
                              {m.name} ({m.email})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Initial status</span>
                        <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}>
                          {STATUS_OPTS.map(o => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Deadline</span>
                        <input
                          type="date"
                          required
                          value={taskForm.dueDate}
                          onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                        />
                      </label>
                    </div>
                    <button type="submit" className="btn primary">
                      Create task
                    </button>
                  </form>
                </section>
              )}

              <section className="section">
                <h2 className="section-title">{isAdmin ? 'All tasks' : 'My tasks'}</h2>
                {tasks.length === 0 ? (
                  <p className="muted">No tasks to show.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="tasks-table">
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Project</th>
                          {isAdmin ? <th>Assignee</th> : null}
                          <th>Deadline</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map(t => (
                          <tr key={t._id}>
                            <td>
                              <strong>{t.title}</strong>
                              {t.description ? <p className="muted small">{t.description}</p> : null}
                            </td>
                            <td>{t.project?.name || '—'}</td>
                            {isAdmin ? (
                              <td>
                                {t.assignedTo?.name || '—'}
                                {isAssigneeRemovedFromTaskProject(t) ? (
                                  <span className="assignee-removed-mark" title="Removed from this project team">
                                    {' '}
                                    (removed)
                                  </span>
                                ) : null}
                              </td>
                            ) : null}
                            <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
                            <td>
                              <select
                                className="status-select"
                                value={t.status}
                                disabled={!isAdmin && String(user?.id ?? user?._id) !== String(t.assignedTo?._id)}
                                onChange={e => updateStatus(t._id, e.target.value)}
                              >
                                {STATUS_OPTS.map(o => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="task-cards">
                      {tasks.map(t => (
                        <article key={t._id} className="task-card">
                          <h4>{t.title}</h4>
                          {t.description ? <p className="muted small">{t.description}</p> : null}
                          <dl className="meta">
                            <div>
                              <dt>Project</dt>
                              <dd>{t.project?.name}</dd>
                            </div>
                            {isAdmin ? (
                              <div>
                                <dt>Assignee</dt>
                                <dd>
                                  {t.assignedTo?.name || '—'}
                                  {isAssigneeRemovedFromTaskProject(t) ? (
                                    <span className="assignee-removed-mark" title="Removed from this project team">
                                      {' '}
                                      (removed)
                                    </span>
                                  ) : null}
                                </dd>
                              </div>
                            ) : null}
                            <div>
                              <dt>Deadline</dt>
                              <dd>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</dd>
                            </div>
                          </dl>
                          <label className="field">
                            <span>Status</span>
                            <select
                              value={t.status}
                              disabled={!isAdmin && String(user?.id ?? user?._id) !== String(t.assignedTo?._id)}
                              onChange={e => updateStatus(t._id, e.target.value)}
                            >
                              {STATUS_OPTS.map(o => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {!isAdmin && (
                <p className="hint muted">You can update status only on tasks assigned to you.</p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default DashboardPage

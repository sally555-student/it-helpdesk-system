import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import * as ticketService from "../services/ticketService";

export default function CreateTicket() {
  const [lookups, setLookups] = useState({ categories: [], priorities: [] });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    ticketService.getLookups().then((data) => {
      setLookups(data);
      // Default to Medium priority if present, otherwise the first option.
      const medium = data.priorities.find((p) => p.priorityName === "Medium");
      setPriorityId(String(medium?.priorityId ?? data.priorities[0]?.priorityId ?? ""));
      setCategoryId(String(data.categories[0]?.categoryId ?? ""));
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const ticket = await ticketService.createTicket({
        title,
        description,
        categoryId: Number(categoryId),
        priorityId: Number(priorityId),
      });
      navigate(`/tickets/${ticket.ticketId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't create the ticket. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <h1>New Ticket</h1>
      </div>

      <form className="panel-form" onSubmit={handleSubmit}>
        {error && <div className="error-banner">{error}</div>}

        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          rows={6}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <div className="form-row">
          <div>
            <label htmlFor="category">Category</label>
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              {lookups.categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority">Priority</label>
            <select id="priority" value={priorityId} onChange={(e) => setPriorityId(e.target.value)} required>
              {lookups.priorities.map((p) => (
                <option key={p.priorityId} value={p.priorityId}>
                  {p.priorityName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-actions">
          <Link to="/tickets" className="button-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit ticket"}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

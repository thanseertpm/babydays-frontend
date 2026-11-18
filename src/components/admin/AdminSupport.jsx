import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  MessageSquare,
  Search,
  Send,
  RefreshCw,
  UserRound,
  Clock,
  X,
} from "lucide-react";
import api from "../../services/api";

const SUPPORT_ENDPOINTS = {
  list: "/admin/controls/contacts/",
  reply: (contactId) =>
    `/admin/controls/contacts/${contactId}/reply/`,
};

const getError = (error) => {
  const data = error.response?.data;

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data?.data === "string") {
    return data.data;
  }

  if (data?.data && typeof data.data === "object") {
    return Object.values(data.data).flat().join(" ");
  }

  return "Something went wrong. Please try again.";
};

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function AdminSupport() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("");

  const [replyMessage, setReplyMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState("");
  const [replyError, setReplyError] = useState("");
  const [success, setSuccess] = useState("");

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (topicFilter.trim()) params.topic = topicFilter.trim();

      const response = await api.get(SUPPORT_ENDPOINTS.list, {
        params,
      });

      const data = response.data?.data;

      const contactList = Array.isArray(data) ? data : [];
setContacts(contactList);
return contactList;

      // Keep the selected message synchronized with refreshed data.
      if (selectedContact) {
        const updatedContact = (Array.isArray(data) ? data : []).find(
          (contact) => contact.id === selectedContact.id,
        );

        setSelectedContact(updatedContact || null);
      }
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, topicFilter]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    setReplyMessage("");
    setReplyError("");
    setSuccess("");
  };

  const handleSendReply = async (event) => {
    event.preventDefault();

    if (!selectedContact || replying || replyMessage.trim().length < 2) {
      return;
    }

    setReplying(true);
    setReplyError("");
    setSuccess("");

    try {
      await api.post(
        SUPPORT_ENDPOINTS.reply(selectedContact.id),
        {
          message: replyMessage.trim(),
        },
      );

      setReplyMessage("");
      setSuccess("Reply sent successfully.");

      const updatedContacts = await loadContacts();

const updatedContact = updatedContacts.find(
  (contact) => contact.id === selectedContact.id,
);

if (updatedContact) {
  setSelectedContact(updatedContact);
}
    } catch (err) {
      setReplyError(getError(err));
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Support Messages
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View customer enquiries and respond to them.
          </p>
        </div>

        <button
          type="button"
          onClick={loadContacts}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Search and filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-3">
        <div className="relative md:col-span-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, message..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-gray-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="replied">Replied</option>
        </select>

        <input
          type="text"
          value={topicFilter}
          onChange={(event) => setTopicFilter(event.target.value)}
          placeholder="Filter by topic"
          className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="grid min-h-[600px] grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.5fr)]">
        {/* Support message list */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
            <h3 className="font-semibold text-gray-900">
              Enquiries
            </h3>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {contacts.length}
            </span>
          </div>

          <div className="max-h-[650px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Loading support messages...
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare
                  size={28}
                  className="mx-auto text-gray-300"
                />
                <p className="mt-3 text-sm font-medium text-gray-700">
                  No messages found
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Customer enquiries will appear here.
                </p>
              </div>
            ) : (
              contacts.map((contact) => {
                const active = selectedContact?.id === contact.id;

                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full border-b border-gray-100 p-4 text-left transition hover:bg-gray-50 ${
                      active ? "bg-gray-50 border-l-4 border-l-gray-900" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {contact.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {contact.email}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
                          contact.status === "replied"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {contact.status}
                      </span>
                    </div>

                    <p className="mt-3 text-xs font-medium text-gray-700">
                      {contact.topic}
                    </p>

                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                      {contact.message}
                    </p>

                    <p className="mt-3 text-[11px] text-gray-400">
                      {formatDate(contact.created_at)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected message and reply */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {!selectedContact ? (
            <div className="flex min-h-[500px] flex-col items-center justify-center p-8 text-center">
              <Mail size={36} className="text-gray-300" />
              <h3 className="mt-4 font-semibold text-gray-800">
                Select a support message
              </h3>
              <p className="mt-1 max-w-xs text-sm text-gray-500">
                Choose an enquiry from the list to view its details and send a reply.
              </p>
            </div>
          ) : (
            <>
              {/* Message header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Enquiry Details
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Message #{selectedContact.id}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close selected message"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5 p-5">
                {/* Customer information */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <UserRound size={16} />
                    Customer Information
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {selectedContact.name}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="mt-1 break-all text-sm font-medium text-gray-800">
                        {selectedContact.email}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {selectedContact.phone || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Topic</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {selectedContact.topic}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Original message */}
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Customer Message
                    </h4>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={13} />
                      {formatDate(selectedContact.created_at)}
                    </span>
                  </div>

                  <div className="mt-3 whitespace-pre-wrap rounded-lg border border-gray-200 p-4 text-sm leading-6 text-gray-700">
                    {selectedContact.message}
                  </div>
                </div>

                {/* Previous replies */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Reply History ({selectedContact.replies?.length || 0})
                  </h4>

                  <div className="mt-3 space-y-3">
                    {selectedContact.replies?.length ? (
                      selectedContact.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="rounded-lg border border-gray-200 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-800">
                              {reply.admin_name || "Admin"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDate(reply.created_at)}
                            </p>
                          </div>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                            {reply.message}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                        No replies have been sent yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Reply form */}
                <form
                  onSubmit={handleSendReply}
                  className="border-t border-gray-100 pt-5"
                >
                  <label className="text-sm font-semibold text-gray-900">
                    Write a Reply
                  </label>

                  <textarea
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    rows={5}
                    maxLength={10000}
                    minLength={2}
                    placeholder="Write your response to the customer..."
                    className="mt-3 w-full resize-y rounded-lg border border-gray-200 p-3 text-sm leading-6 outline-none focus:border-gray-400"
                    required
                  />

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-400">
                      {replyMessage.length}/10000 characters
                    </span>

                    <button
                      type="submit"
                      disabled={
                        replying || replyMessage.trim().length < 2
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send size={15} />
                      {replying ? "Sending..." : "Send Reply"}
                    </button>
                  </div>

                  {replyError && (
                    <p className="mt-3 text-sm text-red-600">
                      {replyError}
                    </p>
                  )}

                  {success && (
                    <p className="mt-3 text-sm text-green-600">
                      {success}
                    </p>
                  )}
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
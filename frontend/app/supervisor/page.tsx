'use client';

import { useState, useEffect } from 'react';
import type { HelpRequest, KnowledgeBaseEntry } from '@/lib/supabase';

export default function SupervisorDashboard() {
  const [pendingRequests, setPendingRequests] = useState<HelpRequest[]>([]);
  const [allRequests, setAllRequests] = useState<HelpRequest[]>([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'knowledge'>('pending');

  useEffect(() => {
    loadData();
    // Refresh every 5 seconds
    const interval = setInterval(loadData, 5000);
    
    // Also check for timeouts periodically
    const timeoutCheck = setInterval(async () => {
      try {
        await fetch('/api/supervisor/check-timeouts', { method: 'POST' });
      } catch (error) {
        console.error('Error checking timeouts:', error);
      }
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(interval);
      clearInterval(timeoutCheck);
    };
  }, []);

  // Clear selected request if it's no longer in pending requests
  useEffect(() => {
    if (selectedRequest && !pendingRequests.find(r => r.id === selectedRequest.id)) {
      setSelectedRequest(null);
      setAnswer('');
    }
  }, [pendingRequests, selectedRequest]);

  const loadData = async () => {
    try {
      // Add cache-busting and no-cache headers
      const timestamp = Date.now();
      const [pendingRes, allRes, kbRes] = await Promise.all([
        fetch(`/api/supervisor/pending?t=${timestamp}`, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetch(`/api/supervisor/requests?t=${timestamp}`, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetch(`/api/knowledge?t=${timestamp}`, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }),
      ]);

      const pendingData = await pendingRes.json();
      const allData = await allRes.json();
      const kbData = await kbRes.json();

      setPendingRequests(pendingData.requests || []);
      setAllRequests(allData.requests || []);
      setKnowledgeEntries(kbData.entries || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleResolve = async () => {
    if (!selectedRequest || !answer.trim()) {
      alert('Please provide an answer');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/supervisor/resolve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          answer: answer.trim(),
          addToKnowledge: true,
        }),
      });

      if (response.ok) {
        // Clear form state first
        setAnswer('');
        setSelectedRequest(null);
        
        // Force immediate data refresh
        await loadData();
        
        alert('Request resolved! The customer has been notified.');
      } else {
        const errorData = await response.json();
        alert(`Error resolving request: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error resolving request:', error);
      alert('Error resolving request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'unresolved':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Supervisor Dashboard</h1>
          <a
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            ← Back to Home
          </a>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Requests ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'knowledge'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Knowledge Base ({knowledgeEntries.length})
            </button>
          </nav>
        </div>

        {/* Pending Requests Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                No pending requests
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-800 font-medium">
                    📋 {pendingRequests.length} pending {pendingRequests.length === 1 ? 'request' : 'requests'} waiting for response
                  </p>
                </div>
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className={`bg-white rounded-lg shadow p-6 transition-all ${
                      selectedRequest?.id === request.id 
                        ? 'ring-2 ring-blue-500 shadow-lg' 
                        : 'hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900">{request.question}</h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>🏠 Room: <span className="font-medium">{request.room_name}</span></p>
                          <p>👤 Participant: <span className="font-medium">{request.participant_identity}</span></p>
                          <p>🕐 Asked: <span className="font-medium">{formatDate(request.created_at)}</span></p>
                          <p>⏰ Timeout: <span className="font-medium">{formatDate(request.timeout_at)}</span></p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                    {selectedRequest?.id === request.id ? (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Your Answer:
                        </label>
                        <textarea
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder="Enter your answer here..."
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          rows={4}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleResolve}
                            disabled={loading || !answer.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Submitting...' : '✓ Submit Answer'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(null);
                              setAnswer('');
                            }}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setAnswer('');
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        💬 Provide Answer
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {allRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                No requests yet
              </div>
            ) : (
              allRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-gray-800">{request.question}</h3>
                      {request.supervisor_answer && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
                          <p className="text-sm font-medium text-green-800 mb-1">Answer:</p>
                          <p className="text-green-700">{request.supervisor_answer}</p>
                        </div>
                      )}
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Room: {request.room_name}</p>
                        <p>Participant: {request.participant_identity}</p>
                        <p>Asked: {formatDate(request.created_at)}</p>
                        {request.resolved_at && (
                          <p>Resolved: {formatDate(request.resolved_at)}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Knowledge Base Tab */}
        {activeTab === 'knowledge' && (
          <div className="space-y-4">
            {knowledgeEntries.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                No knowledge base entries yet
              </div>
            ) : (
              knowledgeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
                >
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">{entry.question}</h3>
                    <p className="text-gray-700 mb-3">{entry.answer}</p>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Usage count: {entry.usage_count}</p>
                    <p>Created: {formatDate(entry.created_at)}</p>
                    <p>Last updated: {formatDate(entry.updated_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

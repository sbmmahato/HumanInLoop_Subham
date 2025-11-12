export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">AI Agent System</h1>
        <p className="text-gray-600 mb-8">Human-in-the-loop AI agent for Glamour Hair Salon</p>
        <div className="space-x-4">
          <a
            href="/supervisor"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Supervisor Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}


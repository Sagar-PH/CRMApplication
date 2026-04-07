<h1 align="center">Customer Relationship Management (CRM) Application</h1>

<p align="center">
  A modern CRM system with analytics, reports, and AI-driven insights built using Angular and Node.js.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Angular-17+-DD0031?style=for-the-badge&logo=angular&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chart.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

<hr />

<h2>📌 Project Overview</h2>

<p>
This CRM application helps businesses manage customers, sales data, and performance metrics.
It goes beyond basic CRUD by providing <strong>analytics dashboards</strong>, 
<strong>sales forecasts</strong>, and a <strong>chatbot-based insights engine</strong>.
</p>

<hr />

<h2>✨ Key Features</h2>

<ul>
  <li>Customer & vendor management</li>
  <li>Sales tracking and performance analytics</li>
  <li>Interactive dashboards using Chart.js</li>
  <li>Sales trend analysis and forecasting</li>
  <li>Reorder level suggestions</li>
  <li>AI-style chatbot for business insights (backend-driven)</li>
  <li>Session-based authentication</li>
</ul>

<hr />

<h2>🛠 Tech Stack</h2>

<ul>
  <li><strong>Frontend:</strong> Angular</li>
  <li><strong>Backend:</strong> Node.js, Express.js</li>
  <li><strong>Database:</strong> MongoDB</li>
  <li><strong>Tools:</strong> Docker</li>
  <li><strong>Charts & Analytics:</strong> Chart.js</li>
  <li><strong>AI Layer:</strong> Rule-based + LLM-ready chatbot insights engine</li>
</ul>

<hr />

<h2>📦 Project Setup</h2>

<p>You can run this <strong>CRM Application</strong> locally using the steps below:</p>

<h3>Clone the Repository</h3>

<pre><code>git clone https://github.com/Sagar-PH/CRMApplication
cd CRMApplication</code></pre>

<h3>1️⃣ Build With Docker Compose (Should have docker installed)</h3>

<pre><code>cd CRMApplication
docker-compose up --build
</code></pre>

<ul>
  <li>Application starts running...</li>
</ul>

<h3>2️⃣ Backend and Frontend Setup</h3>

<pre><code>cd crm_server
npm install
npm run start</code></pre>

<ul>
  <li>Above code will start both frontend and backend</li>
  <li>The backend server will start on <code>http://localhost:3000</code></li>
  <li>The frontend angular application will run on <code>http://localhost:4200</code></li>
</ul>

<hr />

<h2>🤖 AI Reports & Insights Engine</h2>

<p>
The CRM includes a chatbot-based analytics engine that allows users to ask questions like:
</p>

<ul>
  <li><em>"Why did sales drop last month?"</em></li>
  <li><em>"Show sales forecast for next month"</em></li>
  <li><em>"Which products need reordering?"</em></li>
</ul>

<p>
The engine combines:
</p>

<ul>
  <li>Intent detection</li>
  <li>Business reports generation</li>
  <li>Human-readable insights</li>
</ul>

<p>
(Currently powered by hardcoded responses and mock data, with support for future LLM integration.)
</p>

<hr />

<h2>📸 Demo Screenshot</h2>

<p align="center">
  <h3>Dashboard</h3>
  <img src="https://sagar-ph.github.io/Images/CRM-Project.png" width="700" />

  <h3>Analytics and Reports</h3>
  <img src="https://sagar-ph.github.io/Images/CRM-Project-2.png" width="700" />
</p>

<hr />

<h2>🚀 Future Enhancements</h2>

<ul>
  <li>Role-based access control</li>
  <li>Exportable reports (PDF / Excel)</li>
  <li>Real-time notifications and alerts</li>
  <li>LLM-powered insights and recommendations</li>
</ul>

<hr />

<p align="center">
  Built with ❤️ by <strong>Sagar</strong>
</p>

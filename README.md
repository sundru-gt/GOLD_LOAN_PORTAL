# Gold Loan Portal 🏆

A production-ready full-stack gold loan intake portal with AI assistant. Built with Node.js/Express/TypeScript backend, React/Vite/Tailwind frontend, MongoDB database, and Gemini AI integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Features

- **3-Step Loan Application**: Details → Live Quote → Confirm & Submit
- **Exact Financial Math**: `pureGold = net × (karat/24)`, `loan = floor(goldValue × min(ltv, 0.75))`
- **AI Loan Assistant**: Gemini-powered chatbot with function calling (never does math itself)
- **Admin Dashboard**: Paginated leads table with plan/status filters, masked mobile numbers
- **Duplicate Detection**: Rejects same mobile within 7 days (409 Conflict)
- **Comprehensive Testing**: Unit tests for math + API integration tests (400/409 scenarios)
- **Full TypeScript**: End-to-end type safety

---

## 📋 Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- Google Gemini API key (for AI chat)

---

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/sundru-gt/GOLD_LOAN_PORTAL.git
cd GOLD_LOAN_PORTAL
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:
```
MONGODB_URI=mongodb://localhost:27017/gold_loan_portal
GEMINI_API_KEY=your_gemini_api_key_here
PORT=4000
```

### 3. Seed the Database

```bash
npm run seed
```

This creates 5 default loan plans in MongoDB.

### 4. Run Development Servers

```bash
# From root directory (runs both backend + frontend)
npm run dev

# Or run separately:
# Backend: http://localhost:4000
cd backend && npm run dev

# Frontend: http://localhost:5173
cd frontend && npm run dev
```

---

## 🧪 Running Tests

```bash
# From backend directory
cd backend
npm test

# With coverage
npm test -- --coverage
```

Tests cover:
- **Math unit tests**: `computePureGoldGrams`, `computeGoldValueRupees`, `computeEligibleLoanRupees`
- **API integration tests**: 400 validation errors, 409 duplicate conflict, mobile masking
- **In-memory MongoDB**: No external DB required for tests

---

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/gold_loan_portal` | MongoDB connection string |
| `PORT` | No | `4000` | Backend server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `GEMINI_API_KEY` | Yes (for AI) | — | Google Gemini API key |
| `GOLD_RATE_PER_GRAM` | No | `7000` | Mock 24K gold rate in ₹/g |
| `VITE_API_BASE_URL` | No | `http://localhost:4000` | Frontend API base URL |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/loan-schemes` | Active loan plans |
| POST | `/api/v1/quotes` | Calculate quote (no DB write) |
| POST | `/api/v1/leads` | Submit application (201/409) |
| GET | `/api/v1/leads` | Paginated leads (masked mobile) |
| POST | `/api/v1/agent/chat` | AI chat with Gemini |
| GET | `/health` | Health check |

### Error Contract

All errors return:
```json
{
  "error": {
    "code": 400,
    "message": "Validation failed",
    "fields": [
      { "field": "mobile", "message": "Must be a 10-digit Indian number" }
    ]
  }
}
```

---

## 🧮 Loan Mathematics

```
pureGoldGrams     = netWeightGrams × (karat / 24)
goldValueRupees   = round(pureGoldGrams × 7000)      // whole rupees
eligibleLoanRupees = floor(goldValueRupees × min(planMaxLtv, 0.75))
```

- **LTV Cap**: Hard-coded 75% maximum, enforced server-side
- **Money storage**: Integer rupees only (no float rupees)
- **Karat**: Only 18K, 22K, 24K accepted

---

## 📁 Project Structure

```
gold-loan-portal/
├── backend/
│   ├── src/
│   │   ├── models/           # Mongoose schemas (LoanScheme, Lead)
│   │   ├── routes/           # Express route handlers
│   │   ├── schemas/          # Zod validation schemas
│   │   ├── utils/            # Math, DB, error utilities
│   │   ├── __tests__/        # Unit + API integration tests
│   │   ├── app.ts            # Express app factory
│   │   ├── server.ts         # Entry point
│   │   └── seed.ts           # DB seed script
│   ├── jest.config.js
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios API client
│   │   ├── components/       # React components
│   │   │   ├── ui/           # Shared UI library
│   │   │   ├── DetailsForm   # Step 1
│   │   │   ├── LiveQuote     # Step 2
│   │   │   ├── ConfirmStep   # Step 3 + Success
│   │   │   ├── AdminView     # Admin dashboard
│   │   │   └── AiChat        # AI assistant
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx           # Main app orchestrator
│   │   └── main.tsx          # Entry point
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── .env.example
├── .gitignore
├── README.md
├── AI_LOG.md
└── package.json              # Workspace root
```

---

## 🤖 Bonus Tasks Attempted

| Feature | Status | Notes |
|---|---|---|
| Docker | ✅ | `docker-compose.yml` included |
| CI/GitHub Actions | ✅ | `.github/workflows/test.yml` included |
| Idempotency Keys | 🔄 | CORS allows `Idempotency-Key` header, full implementation pending |
| In-memory test DB | ✅ | `mongodb-memory-server` – no external DB needed for tests |

---

## 🔮 What I'd Improve With More Time

1. **Idempotency Keys**: Full implementation for POST /leads to prevent duplicate submissions on network retry
2. **Redis Caching**: Cache gold rate and loan schemes (TTL 5 min) to reduce DB load
3. **JWT Authentication**: Admin panel needs auth; applicant tracking by user ID
4. **Real Gold Rate API**: Integrate live gold price feed (e.g., MCX or Gold API)
5. **WebSockets**: Real-time status updates when admin changes lead status
6. **Rate Limiting**: Per-IP limits on /quotes and /leads endpoints
7. **SMS OTP**: Verify mobile number before submission
---

*Built with ❤️ using Node.js, React, MongoDB, and Gemini AI*

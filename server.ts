import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getInitialSeedData } from './src/data/initialData';
import { Customer, Loan, FollowUpLog } from './src/types';
import { calculateEMI, calculateMaturityDate } from './src/utils/loanCalculations';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'loan_database.json');

export interface AuthConfig {
  email: string;
  name: string;
  password: string;
  recoveryKey: string;
  securityQuestion: string;
  securityAnswer: string;
}

const DEFAULT_AUTH: AuthConfig = {
  email: 'dad@loanoffice.com',
  name: 'Galaxy Consultancy',
  password: 'password123',
  recoveryKey: 'DAD-SECURE-2025',
  securityQuestion: 'What is the name of your loan consultancy office?',
  securityAnswer: 'Galaxy Consultancy',
};

interface DatabaseSchema {
  customers: Customer[];
  loans: Loan[];
  followUps: FollowUpLog[];
  auth: AuthConfig;
  lastUpdated: string;
}

// Ensure database directory and file exist
function initDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data.customers) && Array.isArray(data.loans)) {
        if (!data.auth) {
          data.auth = { ...DEFAULT_AUTH };
        }
        return data as DatabaseSchema;
      }
    } catch (err) {
      console.error('Error reading DB_FILE, reinitializing with seed data:', err);
    }
  }

  const seed = getInitialSeedData();
  const initialDb: DatabaseSchema = {
    customers: seed.customers,
    loans: seed.loans,
    followUps: seed.followUps,
    auth: { ...DEFAULT_AUTH },
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  return initialDb;
}

let dbState: DatabaseSchema = initDatabase();

function saveDatabase() {
  dbState.lastUpdated = new Date().toISOString();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // AUTHENTICATION & SECURITY API
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username or email, and password are required.' });
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const authEmail = (dbState.auth.email || '').toLowerCase();
    const isMatchUser =
      cleanId === authEmail ||
      cleanId === 'admin' ||
      cleanId === 'dad' ||
      cleanId === 'galaxy consultancy' ||
      cleanId === 'galaxyconsultancy' ||
      cleanId === 'galaxyconsultancee' ||
      cleanId === 'galaxy' ||
      cleanId === 'sharma';
    const isMatchPass = String(password).trim() === dbState.auth.password;

    if (isMatchUser && isMatchPass) {
      const sessionToken = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      return res.json({
        success: true,
        user: {
          id: 'user-dad-1',
          name: dbState.auth.name,
          email: dbState.auth.email,
          role: 'admin',
        },
        token: sessionToken,
        loginTime: new Date().toISOString(),
      });
    }

    return res.status(401).json({ error: 'Invalid credentials. Please verify your email/username and password.' });
  });

  app.get('/api/auth/config', (req: Request, res: Response) => {
    res.json({
      email: dbState.auth.email,
      name: dbState.auth.name,
      securityQuestion: dbState.auth.securityQuestion,
      recoveryKeyHint: dbState.auth.recoveryKey ? `${dbState.auth.recoveryKey.slice(0, 4)}****` : 'DAD-****',
    });
  });

  app.post('/api/auth/change-password', (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (String(currentPassword).trim() !== dbState.auth.password) {
      return res.status(401).json({ error: 'Current password does not match our records.' });
    }

    if (String(newPassword).trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
    }

    dbState.auth.password = String(newPassword).trim();
    saveDatabase();
    res.json({ success: true, message: 'Password has been updated successfully.' });
  });

  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    const { recoveryKey, securityAnswer, newPassword } = req.body;
    if (!newPassword || String(newPassword).trim().length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
    }

    let verified = false;
    if (recoveryKey && String(recoveryKey).trim().toUpperCase() === dbState.auth.recoveryKey.toUpperCase()) {
      verified = true;
    } else if (securityAnswer) {
      const cleanAnswer = String(securityAnswer).trim().toLowerCase();
      const storedAnswer = (dbState.auth.securityAnswer || '').toLowerCase().trim();
      if (
        cleanAnswer === storedAnswer ||
        cleanAnswer === 'galaxyconsultancee' ||
        cleanAnswer === 'galaxy consultancee' ||
        cleanAnswer === 'galaxy consultancy' ||
        cleanAnswer === 'dsa solutions'
      ) {
        verified = true;
      }
    }

    if (!verified) {
      return res.status(403).json({
        error: 'Verification failed. The recovery key or security question answer is incorrect.',
      });
    }

    dbState.auth.password = String(newPassword).trim();
    saveDatabase();

    const sessionToken = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    res.json({
      success: true,
      message: 'Password successfully reset! You are now logged in.',
      user: {
        id: 'user-dad-1',
        name: dbState.auth.name,
        email: dbState.auth.email,
        role: 'admin',
      },
      token: sessionToken,
      loginTime: new Date().toISOString(),
    });
  });

  app.post('/api/auth/update-profile', (req: Request, res: Response) => {
    const { name, email, securityQuestion, securityAnswer, recoveryKey } = req.body;
    if (name) dbState.auth.name = String(name).trim();
    if (email) dbState.auth.email = String(email).trim();
    if (securityQuestion) dbState.auth.securityQuestion = String(securityQuestion).trim();
    if (securityAnswer) dbState.auth.securityAnswer = String(securityAnswer).trim();
    if (recoveryKey) dbState.auth.recoveryKey = String(recoveryKey).trim();

    saveDatabase();
    res.json({
      success: true,
      message: 'Security credentials updated.',
      config: {
        name: dbState.auth.name,
        email: dbState.auth.email,
        securityQuestion: dbState.auth.securityQuestion,
        recoveryKeyHint: `${dbState.auth.recoveryKey.slice(0, 4)}****`,
      },
    });
  });

  // CUSTOMERS API
  app.get('/api/customers', (req: Request, res: Response) => {
    res.json(dbState.customers);
  });

  app.post('/api/customers', (req: Request, res: Response) => {
    const { name, mobile, alternatePhone, email, address, city, employmentType, monthlyIncome, panOrId, notes } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ error: 'Name and mobile are required.' });
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      mobile: mobile.trim(),
      alternatePhone: alternatePhone ? alternatePhone.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      employmentType: employmentType || 'Salaried',
      monthlyIncome: Number(monthlyIncome) || 0,
      panOrId: panOrId ? panOrId.trim().toUpperCase() : '',
      notes: notes ? notes.trim() : '',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    dbState.customers.unshift(newCustomer);
    saveDatabase();
    res.status(201).json(newCustomer);
  });

  app.put('/api/customers/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = dbState.customers.findIndex((c) => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const current = dbState.customers[index];
    const updated: Customer = {
      ...current,
      ...req.body,
      id: current.id,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    dbState.customers[index] = updated;

    // Also cascade customer name and mobile updates to related loans
    dbState.loans = dbState.loans.map((loan) => {
      if (loan.customerId === id) {
        return {
          ...loan,
          customerName: updated.name,
          customerMobile: updated.mobile,
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
      return loan;
    });

    saveDatabase();
    res.json(updated);
  });

  app.delete('/api/customers/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    dbState.customers = dbState.customers.filter((c) => c.id !== id);
    // Also remove or keep associated loans? Let's remove associated loans to prevent orphan records
    dbState.loans = dbState.loans.filter((l) => l.customerId !== id);
    dbState.followUps = dbState.followUps.filter((f) => f.customerId !== id);
    saveDatabase();
    res.json({ success: true, id });
  });

  // LOANS API
  app.get('/api/loans', (req: Request, res: Response) => {
    res.json(dbState.loans);
  });

  app.post('/api/loans', (req: Request, res: Response) => {
    const {
      customerId,
      bankName,
      loanType,
      accountNumber,
      principalAmount,
      interestRate,
      tenureMonths,
      disbursalDate,
      bankCommissionPercent,
      commissionStatus,
      status,
      notes,
    } = req.body;

    const customer = dbState.customers.find((c) => c.id === customerId);
    if (!customer) {
      return res.status(400).json({ error: 'Valid customer ID is required.' });
    }

    const principal = Number(principalAmount) || 0;
    const rate = Number(interestRate) || 0;
    const tenure = Number(tenureMonths) || 12;
    const commPercent = Number(bankCommissionPercent) || 0;
    const emi = req.body.emiAmount ? Number(req.body.emiAmount) : calculateEMI(principal, rate, tenure);
    const maturity = req.body.maturityDate || calculateMaturityDate(disbursalDate, tenure);
    const commAmount = req.body.commissionAmount ? Number(req.body.commissionAmount) : Math.round((principal * commPercent) / 100);

    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      customerId,
      customerName: customer.name,
      customerMobile: customer.mobile,
      bankName: bankName || 'Bank',
      loanType: loanType || 'Personal Loan',
      accountNumber: accountNumber ? accountNumber.trim() : `AC-${Math.floor(100000 + Math.random() * 900000)}`,
      principalAmount: principal,
      interestRate: rate,
      tenureMonths: tenure,
      emiAmount: emi,
      disbursalDate: disbursalDate || new Date().toISOString().split('T')[0],
      maturityDate: maturity,
      bankCommissionPercent: commPercent,
      commissionAmount: commAmount,
      commissionStatus: commissionStatus || 'Pending',
      status: status || 'Active',
      notes: notes || '',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    dbState.loans.unshift(newLoan);
    saveDatabase();
    res.status(201).json(newLoan);
  });

  app.put('/api/loans/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = dbState.loans.findIndex((l) => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Loan not found.' });
    }

    const current = dbState.loans[index];
    const principal = req.body.principalAmount !== undefined ? Number(req.body.principalAmount) : current.principalAmount;
    const commPercent = req.body.bankCommissionPercent !== undefined ? Number(req.body.bankCommissionPercent) : current.bankCommissionPercent;
    const commAmount = req.body.commissionAmount !== undefined ? Number(req.body.commissionAmount) : Math.round((principal * commPercent) / 100);

    const updated: Loan = {
      ...current,
      ...req.body,
      id: current.id,
      commissionAmount: commAmount,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    dbState.loans[index] = updated;
    saveDatabase();
    res.json(updated);
  });

  app.delete('/api/loans/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    dbState.loans = dbState.loans.filter((l) => l.id !== id);
    saveDatabase();
    res.json({ success: true, id });
  });

  // FOLLOW-UPS API
  app.get('/api/followups', (req: Request, res: Response) => {
    res.json(dbState.followUps);
  });

  app.post('/api/followups', (req: Request, res: Response) => {
    const { customerId, loanId, outcome, notes, nextFollowUpDate, agentName } = req.body;
    const customer = dbState.customers.find((c) => c.id === customerId);

    const newFollowUp: FollowUpLog = {
      id: `fu-${Date.now()}`,
      customerId,
      customerName: customer ? customer.name : 'Unknown Customer',
      loanId: loanId || '',
      date: new Date().toISOString().split('T')[0],
      outcome: outcome || 'Interested - Needs New Loan',
      notes: notes || '',
      nextFollowUpDate: nextFollowUpDate || '',
      agentName: agentName || "Dad's Office",
      createdAt: new Date().toISOString().split('T')[0],
    };

    dbState.followUps.unshift(newFollowUp);
    saveDatabase();
    res.status(201).json(newFollowUp);
  });

  // RESET / SEED API
  app.post('/api/reset-seed', (req: Request, res: Response) => {
    const seed = getInitialSeedData();
    dbState = {
      customers: seed.customers,
      loans: seed.loans,
      followUps: seed.followUps,
      auth: dbState.auth || DEFAULT_AUTH,
      lastUpdated: new Date().toISOString(),
    };
    saveDatabase();
    res.json({ success: true, message: 'Database reset to initial sample records' });
  });

  // EXPORT / IMPORT API
  app.get('/api/export', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="loan_tracker_backup.json"');
    res.send(JSON.stringify(dbState, null, 2));
  });

  app.post('/api/import', (req: Request, res: Response) => {
    const { customers, loans, followUps, auth } = req.body;
    if (!Array.isArray(customers) || !Array.isArray(loans)) {
      return res.status(400).json({ error: 'Invalid backup format. Must contain customers and loans arrays.' });
    }

    dbState = {
      customers,
      loans,
      followUps: Array.isArray(followUps) ? followUps : [],
      auth: auth && auth.password ? auth : (dbState.auth || DEFAULT_AUTH),
      lastUpdated: new Date().toISOString(),
    };
    saveDatabase();
    res.json({ success: true, count: { customers: customers.length, loans: loans.length } });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Loan Consultancy Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

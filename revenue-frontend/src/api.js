import axios from "axios";

// In production (Railway) the API is same origin, in dev it's localhost:3001
const BASE = import.meta.env.PROD ? "/api" : "http://localhost:3001/api";

const API = axios.create({ baseURL: BASE });

// Attach token to every request
API.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem("ango_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// If 401 received, clear session and reload to show login
API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem("ango_token");
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const login              = (u, p) => API.post("/auth/login", { username: u, password: p });
export const getKPIs            = ()     => API.get("/global/kpis");
export const getMonthly         = (year) => API.get("/revenue/monthly", { params: { year } });
export const getCustomers       = (p)    => API.get("/customers", { params: p });
export const getCustomerTxs     = (id)   => API.get(`/customers/${id}/transactions`);
export const getCategories      = ()     => API.get("/categories");
export const getExchangeRates   = ()     => API.get("/exchange-rates");
export const getDuplicates      = ()     => API.get("/quality/duplicates");
export const resolveDuplicate   = (id,d) => API.patch(`/quality/duplicates/${id}`, d);
export const getCompare         = (a, b) => API.get("/compare", { params: { year_a: a, year_b: b } });
export const getCategoryRevenue = (year) => API.get("/categories/revenue", { params: { year } });

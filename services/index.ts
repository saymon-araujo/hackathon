import axios from "axios";

const api = axios.create({
  baseURL: 'https://buspvgubzztvhsbtzemz.supabase.co/functions/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  },
});

export default api;

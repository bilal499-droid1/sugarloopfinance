import dns from 'node:dns';
import mongoose from 'mongoose';

// On some Windows setups Node only sees a loopback DNS server that refuses the
// SRV lookups mongodb+srv:// needs. Fall back to public resolvers in that case.
const useWorkingDns = () => {
  const servers = dns.getServers();
  if (servers.length && servers.every((s) => s === '127.0.0.1' || s === '::1')) {
    dns.setServers(['1.1.1.1', '8.8.8.8']);
  }
};

export const connectDB = async () => {
  if (process.env.MONGO_URI?.startsWith('mongodb+srv://')) useWorkingDns();
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
};

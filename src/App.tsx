/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Plus, 
  Upload, 
  Search, 
  Filter, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Moon, 
  Sun,
  Trash2,
  X,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';
import { cn, formatCurrency, type InventoryItem } from './lib/utils';

// --- Components ---

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-6 flex flex-col gap-2 relative overflow-hidden group"
  >
    <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-10 rounded-full", color)} />
    <div className="flex justify-between items-start">
      <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">
        <Icon size={20} className="text-zinc-600 dark:text-zinc-400" />
      </div>
      {trend && (
        <span className={cn("text-xs font-bold px-2 py-1 rounded-full", trend > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">{value}</h3>
    </div>
  </motion.div>
);

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card w-full max-w-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [filterDiscontinued, setFilterDiscontinued] = useState<'all' | 'yes' | 'no'>('all');

  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    id: '',
    name: '',
    description: '',
    unit_price: 0,
    quantity: 0,
    stock_value: 0,
    stock_level: 0,
    reorder_days: 0,
    reorder_quantity: 0,
    discontinued: false
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch inventory", err);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemToSave = {
      ...newItem,
      stock_value: (newItem.unit_price || 0) * (newItem.quantity || 0)
    };
    
    try {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemToSave)
      });
      fetchInventory();
      setIsModalOpen(false);
      setNewItem({ id: '', name: '', description: '', unit_price: 0, quantity: 0, stock_value: 0, stock_level: 0, reorder_days: 0, reorder_quantity: 0, discontinued: false });
    } catch (err) {
      console.error("Failed to add item", err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      fetchInventory();
    } catch (err) {
      console.error("Failed to delete item", err);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
      complete: async (results) => {
        const parsedItems = results.data.map((row: any) => {
          // Clean currency strings like "R$ 51,00"
          const cleanPrice = (str: string) => {
            if (!str) return 0;
            return parseFloat(str.replace('R$', '').replace('.', '').replace(',', '.').trim());
          };

          return {
            id: row['ID de estoque'] || row['id'] || `ITEM-${Math.random().toString(36).substr(2, 9)}`,
            name: row['Nome'] || row['name'] || '',
            description: row['Descrição'] || row['description'] || '',
            unit_price: cleanPrice(row['Preço unitário'] || row['unit_price']),
            quantity: parseInt(row['Quantidade em estoque'] || row['quantity'] || '0'),
            stock_value: cleanPrice(row['Valor de estoque'] || row['stock_value']),
            stock_level: parseInt(row['Nível de estoque'] || row['stock_level'] || '0'),
            reorder_days: parseInt(row['Nova encomenda em X dias'] || row['reorder_days'] || '0'),
            reorder_quantity: parseInt(row['Quantidade a encomendar'] || row['reorder_quantity'] || '0'),
            discontinued: (row['Descontinuado?'] || row['discontinued'] || '').toLowerCase().includes('sim')
          };
        });

        try {
          await fetch('/api/inventory/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedItems)
          });
          fetchInventory();
          setIsImportModalOpen(false);
        } catch (err) {
          console.error("Bulk import failed", err);
        }
      }
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false
  } as any);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterDiscontinued === 'all' ? true :
                           filterDiscontinued === 'yes' ? item.discontinued : !item.discontinued;
      return matchesSearch && matchesFilter;
    });
  }, [items, searchTerm, filterDiscontinued]);

  const kpis = useMemo(() => {
    const totalValue = items.reduce((sum, item) => sum + item.stock_value, 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const lowStock = items.filter(item => item.quantity < item.stock_level).length;
    const discontinued = items.filter(item => item.discontinued).length;
    
    return { totalValue, totalItems, lowStock, discontinued };
  }, [items]);

  const chartData = useMemo(() => {
    return items.slice(0, 10).map(item => ({
      name: item.name.length > 15 ? item.name.substring(0, 12) + '...' : item.name,
      valor: item.stock_value,
      qtd: item.quantity
    }));
  }, [items]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-500">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-globo-red rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-globo-blue rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-globo-red rounded-lg flex items-center justify-center text-white font-black text-xl shadow-lg shadow-globo-red/20">
              G
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Globo<span className="text-globo-red">Stock</span></h1>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={cn("text-sm font-bold uppercase tracking-widest transition-colors", activeTab === 'dashboard' ? "text-globo-red" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className={cn("text-sm font-bold uppercase tracking-widest transition-colors", activeTab === 'inventory' ? "text-globo-red" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}
            >
              Inventário
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-full glass hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-5 py-2.5 rounded-full font-bold text-sm hover:scale-105 transition-transform active:scale-95"
            >
              <Plus size={18} />
              Novo Produto
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-black tracking-tight">Visão Geral</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-1">Análise de desempenho e saúde do estoque.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-2 glass px-4 py-2 rounded-xl font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Upload size={18} />
                    Importar CSV
                  </button>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Valor Total" value={formatCurrency(kpis.totalValue)} icon={DollarSign} trend={12} color="bg-emerald-500" />
                <StatCard title="Itens em Estoque" value={kpis.totalItems} icon={Package} trend={5} color="bg-blue-500" />
                <StatCard title="Estoque Baixo" value={kpis.lowStock} icon={AlertTriangle} color="bg-amber-500" />
                <StatCard title="Descontinuados" value={kpis.discontinued} icon={TrendingUp} color="bg-rose-500" />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black uppercase tracking-tight">Valor por Produto (Top 10)</h3>
                    <TrendingUp size={20} className="text-zinc-400" />
                  </div>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c4170c" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#c4170c" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: isDarkMode ? '#18181b' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Area type="monotone" dataKey="valor" stroke="#c4170c" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-black uppercase tracking-tight">Quantidade em Estoque</h3>
                    <Package size={20} className="text-zinc-400" />
                  </div>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888822" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip 
                          cursor={{ fill: '#88888811' }}
                          contentStyle={{ backgroundColor: isDarkMode ? '#18181b' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Bar dataKey="qtd" fill="#0669b2" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-4xl font-black tracking-tight">Inventário</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-1">Gerencie seus produtos e níveis de estoque.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar por nome ou ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 glass rounded-xl focus:outline-none focus:ring-2 focus:ring-globo-red/50 transition-all font-medium"
                    />
                  </div>
                  <div className="flex items-center glass rounded-xl p-1">
                    <button 
                      onClick={() => setFilterDiscontinued('all')}
                      className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all", filterDiscontinued === 'all' ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}
                    >
                      Todos
                    </button>
                    <button 
                      onClick={() => setFilterDiscontinued('no')}
                      className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all", filterDiscontinued === 'no' ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}
                    >
                      Ativos
                    </button>
                    <button 
                      onClick={() => setFilterDiscontinued('yes')}
                      className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all", filterDiscontinued === 'yes' ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}
                    >
                      Descontinuados
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-zinc-500">ID</th>
                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-zinc-500">Produto</th>
                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 text-right">Preço</th>
                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 text-center">Qtd</th>
                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 text-right">Valor Total</th>
                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 text-center">Status</th>
                        <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-zinc-500 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors group">
                          <td className="px-6 py-5 font-mono text-xs text-zinc-500">{item.id}</td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="font-bold text-zinc-900 dark:text-white">{item.name}</span>
                              <span className="text-xs text-zinc-500 truncate max-w-[200px]">{item.description}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right font-medium">{formatCurrency(item.unit_price)}</td>
                          <td className="px-6 py-5 text-center">
                            <span className={cn(
                              "inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm",
                              item.quantity < item.stock_level ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            )}>
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-globo-blue">{formatCurrency(item.stock_value)}</td>
                          <td className="px-6 py-5 text-center">
                            {item.discontinued ? (
                              <span className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase rounded-full">Descontinuado</span>
                            ) : item.quantity < item.stock_level ? (
                              <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-black uppercase rounded-full">Reposição</span>
                            ) : (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-black uppercase rounded-full">Ativo</span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button 
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredItems.length === 0 && (
                  <div className="p-20 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                      <Search size={32} className="text-zinc-400" />
                    </div>
                    <h3 className="text-xl font-bold">Nenhum produto encontrado</h3>
                    <p className="text-zinc-500 mt-2">Tente ajustar seus filtros ou adicionar um novo produto.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Manual Entry Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Novo Produto"
      >
        <form onSubmit={handleAddItem} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500">ID de Estoque</label>
              <input 
                required
                type="text" 
                value={newItem.id}
                onChange={e => setNewItem({...newItem, id: e.target.value})}
                className="w-full px-4 py-3 glass rounded-xl focus:outline-none focus:ring-2 focus:ring-globo-red/50"
                placeholder="Ex: IN0001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Nome do Item</label>
              <input 
                required
                type="text" 
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
                className="w-full px-4 py-3 glass rounded-xl focus:outline-none focus:ring-2 focus:ring-globo-red/50"
                placeholder="Ex: Teclado Mecânico"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Descrição</label>
            <textarea 
              value={newItem.description}
              onChange={e => setNewItem({...newItem, description: e.target.value})}
              className="w-full px-4 py-3 glass rounded-xl focus:outline-none focus:ring-2 focus:ring-globo-red/50 min-h-[100px]"
              placeholder="Descreva o produto..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Preço Unitário</label>
              <input 
                required
                type="number" 
                step="0.01"
                value={newItem.unit_price}
                onChange={e => setNewItem({...newItem, unit_price: parseFloat(e.target.value)})}
                className="w-full px-4 py-3 glass rounded-xl focus:outline-none focus:ring-2 focus:ring-globo-red/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Quantidade</label>
              <input 
                required
                type="number" 
                value={newItem.quantity}
                onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})}
                className="w-full px-4 py-3 glass rounded-xl focus:outline-none focus:ring-2 focus:ring-globo-red/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Nível Mínimo</label>
              <input 
                required
                type="number" 
                value={newItem.stock_level}
                onChange={e => setNewItem({...newItem, stock_level: parseInt(e.target.value)})}
                className="w-full px-4 py-3 glass rounded-xl focus:outline-none focus:ring-2 focus:ring-globo-red/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 glass rounded-xl">
            <input 
              type="checkbox" 
              id="discontinued"
              checked={newItem.discontinued}
              onChange={e => setNewItem({...newItem, discontinued: e.target.checked})}
              className="w-5 h-5 rounded accent-globo-red"
            />
            <label htmlFor="discontinued" className="text-sm font-bold cursor-pointer">Produto Descontinuado?</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-4 glass rounded-xl font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-95"
            >
              Salvar Produto
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        title="Importar Dados"
      >
        <div className="space-y-6">
          <div 
            {...getRootProps()} 
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
              isDragActive ? "border-globo-red bg-globo-red/5" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
            )}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <FileSpreadsheet size={32} className="text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold">Arraste seu arquivo CSV aqui</h3>
            <p className="text-zinc-500 mt-2 text-sm">Ou clique para selecionar um arquivo do seu computador.</p>
            <div className="mt-6 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-black uppercase tracking-widest">
              Selecionar Arquivo
            </div>
          </div>

          <div className="glass rounded-xl p-6 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">Instruções de Formatação</h4>
            <ul className="text-sm space-y-2 text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-globo-red mt-1.5 shrink-0" />
                O arquivo deve estar no formato CSV com delimitador ponto e vírgula (;).
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-globo-red mt-1.5 shrink-0" />
                Colunas esperadas: ID de estoque, Nome, Descrição, Preço unitário, Quantidade em estoque, etc.
              </li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}

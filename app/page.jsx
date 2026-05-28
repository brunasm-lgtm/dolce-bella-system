
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { supabase, hasSupabase } from '../lib/supabase';
import {
  Home, ShoppingBag, ReceiptText, Tags, Archive, Repeat, Users, BarChart3, Settings,
  Bell, Menu, Plus, DollarSign, Package, AlertTriangle, ClipboardList, Pencil, Trash2,
  Check, X, CreditCard, UserPlus, WalletCards, CalendarDays, Search, Download, UploadCloud
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const categoriesDefault = ['Blusas','Calças','Conjuntos','Vestidos','Saias','Casacos e Jaquetas','Shorts'];

const sampleProducts = [
  { id:'1', code:'DB001', name:'Blusa Charme', category:'Blusas', cost:79.9, extra_cost:0, margin:100, sale_price:159.9, stock:6, min_stock:2 },
  { id:'2', code:'DB002', name:'Calça Pantalona', category:'Calças', cost:94.9, extra_cost:5, margin:95, sale_price:194.8, stock:3, min_stock:2 },
  { id:'3', code:'DB003', name:'Conjunto Marrom', category:'Conjuntos', cost:145, extra_cost:10, margin:110, sale_price:325.5, stock:1, min_stock:2 }
];

const sampleClients = [
  { id:'c1', name:'Ana Paula', phone:'48999990000', notes:'Cliente fiel', created_at:new Date().toISOString() },
  { id:'c2', name:'Marina Souza', phone:'48988881111', notes:'Prefere conjuntos', created_at:new Date().toISOString() }
];

const today = new Date().toISOString().slice(0,10);
const money = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const num = v => Number(String(v || 0).replace(',','.')) || 0;
const baseCost = p => num(p.cost) + num(p.extra_cost);

export default function App(){
  const [page,setPage] = useState('Dashboard');
  const [sidebar,setSidebar] = useState(false);
  const [products,setProducts] = useState([]);
  const [sales,setSales] = useState([]);
  const [clients,setClients] = useState([]);
  const [payments,setPayments] = useState([]);
  const [categories,setCategories] = useState(categoriesDefault);
  const [search,setSearch] = useState('');
  const [period,setPeriod] = useState('mes');
  const [modal,setModal] = useState(null);
  const [openCats,setOpenCats] = useState({Blusas:true});
  const [toast,setToast] = useState('');
  const [loading,setLoading] = useState(true);

  const online = hasSupabase;

  useEffect(()=>{ loadAll(); },[]);
  useEffect(()=>{ if(toast){ const t=setTimeout(()=>setToast(''),3000); return ()=>clearTimeout(t); } },[toast]);

  async function loadAll(){
    setLoading(true);
    if(online){
      try{
        const [p,s,c,pay] = await Promise.all([
          supabase.from('products').select('*').order('created_at',{ascending:false}),
          supabase.from('sales').select('*').order('created_at',{ascending:false}),
          supabase.from('clients').select('*').order('created_at',{ascending:false}),
          supabase.from('payments').select('*').order('created_at',{ascending:false})
        ]);
        if(p.error) throw p.error;
        setProducts(p.data?.length ? p.data : []);
        setSales(s.data || []);
        setClients(c.data || []);
        setPayments(pay.data || []);
      }catch(e){
        console.error(e);
        hydrateLocal();
        setToast('Falha ao carregar Supabase. Usando modo local.');
      }
    }else hydrateLocal();
    setLoading(false);
  }

  function hydrateLocal(){
    setProducts(JSON.parse(localStorage.getItem('db_products') || 'null') || sampleProducts);
    setSales(JSON.parse(localStorage.getItem('db_sales') || '[]'));
    setClients(JSON.parse(localStorage.getItem('db_clients') || 'null') || sampleClients);
    setPayments(JSON.parse(localStorage.getItem('db_payments') || '[]'));
  }

  function saveLocal(key,data){ if(!online) localStorage.setItem(key,JSON.stringify(data)); }

  async function upsertProduct(product){
    let final = {...product, cost:num(product.cost), extra_cost:num(product.extra_cost), sale_price:num(product.sale_price), margin:num(product.margin), stock:num(product.stock), min_stock:num(product.min_stock)};
    if(!final.id) final.id = crypto.randomUUID();
    if(online){
      const {error}=await supabase.from('products').upsert(final);
      if(error) return setToast(error.message);
      await loadAll();
    }else{
      const exists=products.some(p=>p.id===final.id);
      const next=exists?products.map(p=>p.id===final.id?final:p):[final,...products];
      setProducts(next); saveLocal('db_products',next);
    }
    setModal(null); setToast('Produto salvo.');
  }

  async function deleteProduct(id){
    if(!confirm('Excluir produto?')) return;
    if(online){
      await supabase.from('products').delete().eq('id',id);
      await loadAll();
    }else{
      const next=products.filter(p=>p.id!==id); setProducts(next); saveLocal('db_products',next);
    }
  }

  async function upsertClient(client){
    let final = {...client};
    if(!final.id) final.id = crypto.randomUUID();
    if(online){
      const {error}=await supabase.from('clients').upsert(final);
      if(error) return setToast(error.message);
      await loadAll();
    }else{
      const exists=clients.some(c=>c.id===final.id);
      const next=exists?clients.map(c=>c.id===final.id?final:c):[final,...clients];
      setClients(next); saveLocal('db_clients',next);
    }
    setModal(null); setToast('Cliente salvo.');
  }

  async function registerSale(form){
    const product = products.find(p=>p.code?.toLowerCase()===form.code?.toLowerCase());
    if(!product) return setToast('Código do produto não encontrado.');
    const quantity = num(form.quantity || 1);
    if(quantity <= 0) return setToast('Quantidade inválida.');
    if(num(product.stock) < quantity) return setToast('Estoque insuficiente.');

    const total = num(form.total || product.sale_price * quantity);
    const paid = num(form.paid);
    const sale = {
      id: crypto.randomUUID(),
      sale_date: form.sale_date || today,
      product_code: product.code,
      product_name: product.name,
      client_id: form.client_id || null,
      client_name: clients.find(c=>c.id===form.client_id)?.name || form.client_name || '',
      quantity,
      unit_price: total / quantity,
      total,
      paid,
      pending: Math.max(0,total-paid),
      payment: form.payment || 'Pix',
      due_date: form.due_date || null,
      status: Math.max(0,total-paid) > 0 ? 'pendente' : 'pago',
      profit: total - baseCost(product)*quantity
    };
    const updatedProduct = {...product, stock:num(product.stock)-quantity};

    if(online){
      const {error}=await supabase.from('sales').insert(sale);
      if(error) return setToast(error.message);
      await supabase.from('products').update({stock: updatedProduct.stock}).eq('id',product.id);
      await loadAll();
    }else{
      const nextSales=[sale,...sales]; setSales(nextSales); saveLocal('db_sales',nextSales);
      const nextProducts=products.map(p=>p.id===product.id?updatedProduct:p); setProducts(nextProducts); saveLocal('db_products',nextProducts);
    }
    setModal(null); setToast('Venda lançada.');
  }

  async function registerPayment(form){
    const sale = sales.find(s=>s.id===form.sale_id);
    if(!sale) return setToast('Venda não encontrada.');
    const amount = num(form.amount);
    if(amount <= 0) return setToast('Valor inválido.');
    const payment = {id:crypto.randomUUID(), sale_id:sale.id, client_id:sale.client_id, client_name:sale.client_name, amount, payment_date:form.payment_date||today, method:form.method||'Pix', notes:form.notes||''};
    const newPaid = num(sale.paid)+amount;
    const newPending = Math.max(0,num(sale.total)-newPaid);
    const updatedSale = {...sale, paid:newPaid, pending:newPending, status:newPending>0?'pendente':'pago'};
    if(online){
      await supabase.from('payments').insert(payment);
      await supabase.from('sales').update({paid:newPaid,pending:newPending,status:updatedSale.status}).eq('id',sale.id);
      await loadAll();
    }else{
      const nextPayments=[payment,...payments]; setPayments(nextPayments); saveLocal('db_payments',nextPayments);
      const nextSales=sales.map(s=>s.id===sale.id?updatedSale:s); setSales(nextSales); saveLocal('db_sales',nextSales);
    }
    setModal(null); setToast('Pagamento registrado.');
  }

  const filteredSales = useMemo(()=>{
    const now = new Date(today);
    return sales.filter(s=>{
      const d = new Date(s.sale_date || s.created_at);
      const diff=(now-d)/86400000;
      if(period==='hoje') return (s.sale_date || '').slice(0,10)===today;
      if(period==='7dias') return diff<=7;
      if(period==='mes') return (s.sale_date || '').slice(0,7)===today.slice(0,7);
      return true;
    });
  },[sales,period]);

  const totals = useMemo(()=>{
    const salesTotal=filteredSales.reduce((a,s)=>a+num(s.total),0);
    const profit=filteredSales.reduce((a,s)=>a+num(s.profit),0);
    const sold=filteredSales.reduce((a,s)=>a+num(s.quantity),0);
    const low=products.filter(p=>num(p.stock)<=num(p.min_stock)).length;
    const pending=sales.reduce((a,s)=>a+num(s.pending),0);
    const overdue=sales.filter(s=>num(s.pending)>0 && s.due_date && s.due_date<today).length;
    return {salesTotal,profit,sold,low,pending,overdue};
  },[filteredSales,products,sales]);

  const salesByDay = useMemo(()=>{
    const map={};
    filteredSales.forEach(s=>{
      const key=(s.sale_date || today).slice(5);
      if(!map[key]) map[key]={date:key,vendas:0,lucro:0};
      map[key].vendas+=num(s.total); map[key].lucro+=num(s.profit);
    });
    return Object.values(map);
  },[filteredSales]);

  const salesByCategory = useMemo(()=>{
    const map={};
    filteredSales.forEach(s=>{
      const p=products.find(x=>x.code===s.product_code);
      const cat=p?.category || 'Outros';
      if(!map[cat]) map[cat]={categoria:cat,total:0};
      map[cat].total+=num(s.total);
    });
    return Object.values(map);
  },[filteredSales,products]);

  const filteredProducts = products.filter(p=>(p.name+p.code+p.category).toLowerCase().includes(search.toLowerCase()));
  const clientStats = clients.map(c=>{
    const cs=sales.filter(s=>s.client_id===c.id || s.client_name===c.name);
    return {...c, total:cs.reduce((a,s)=>a+num(s.total),0), paid:cs.reduce((a,s)=>a+num(s.paid),0), pending:cs.reduce((a,s)=>a+num(s.pending),0), purchases:cs.length};
  });

  const notifications = [
    ...products.filter(p=>num(p.stock)<=num(p.min_stock)).map(p=>`Estoque baixo: ${p.name}`),
    ...sales.filter(s=>num(s.pending)>0 && s.due_date && s.due_date<today).map(s=>`Cliente em atraso: ${s.client_name || 'Sem nome'} - ${money(s.pending)}`)
  ];

  return <div className="app">
    <aside className={`sidebar ${sidebar?'open':''}`}>
      <div className="logoWrap"><Image className="logo" src="/logo.svg" alt="Dolce Bella Atelier" width={210} height={145} priority /></div>
      <nav className="nav">
        {[
          ['Dashboard',Home],['Produtos',ShoppingBag],['Vendas',ReceiptText],['Clientes',Users],['Categorias',Tags],['Estoque',Archive],['Movimentações',Repeat],['Fornecedores',UserPlus],['Relatórios',BarChart3],['Configurações',Settings]
        ].map(([label,Icon])=><button key={label} className={`navBtn ${page===label?'active':''}`} onClick={()=>{setPage(label);setSidebar(false)}}><Icon size={20}/>{label}</button>)}
      </nav>
      <div className="sideBox">
        <strong>{online?'Salvamento Online':'Versão Local'}</strong>
        <p>{online?'Dados salvos no Supabase.':'Configure Supabase para salvar online.'}</p>
        <p>{online?'✅ Conectado':'⚠️ Local'}</p>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="pageTitle"><button className="iconBtn mobileMenu" onClick={()=>setSidebar(true)}><Menu/></button>{page} • Bem-vinda, Administradora!</div>
        <button className="iconBtn badgeBell" onClick={()=>setModal({type:'notifications'})}><Bell/>{notifications.length>0 && <span>{notifications.length}</span>}</button>
      </header>
      <div className="content">
        {toast && <div className="notice"><Check/> {toast}</div>}
        {loading ? <div className="panel">Carregando...</div> : <>
          {page==='Dashboard' && <Dashboard totals={totals} period={period} setPeriod={setPeriod} salesByDay={salesByDay} salesByCategory={salesByCategory} online={online} setModal={setModal} products={products} clients={clients}/>}
          {page==='Produtos' && <Products products={filteredProducts} search={search} setSearch={setSearch} setModal={setModal} deleteProduct={deleteProduct} openCats={openCats} setOpenCats={setOpenCats}/>}
          {page==='Vendas' && <Sales sales={filteredSales} clients={clients} setModal={setModal} period={period} setPeriod={setPeriod}/>}
          {page==='Clientes' && <Clients clients={clientStats} sales={sales} setModal={setModal}/>}
          {page==='Categorias' && <Categories categories={categories} setCategories={setCategories} products={products}/>}
          {page==='Estoque' && <Stock products={products} setModal={setModal}/>}
          {page==='Movimentações' && <Movements sales={sales} payments={payments}/>}
          {page==='Fornecedores' && <Suppliers/>}
          {page==='Relatórios' && <Reports totals={totals} sales={sales} clients={clientStats}/>}
          {page==='Configurações' && <SettingsPage online={online} products={products} sales={sales} clients={clients} payments={payments}/>}
        </>}
      </div>
    </main>

    {modal && <Modal modal={modal} setModal={setModal} products={products} clients={clients} sales={sales} upsertProduct={upsertProduct} registerSale={registerSale} upsertClient={upsertClient} registerPayment={registerPayment} notifications={notifications}/>}
  </div>
}

function Dashboard({totals,period,setPeriod,salesByDay,salesByCategory,online,setModal,products,clients}){
 return <>
  <div className="grid4">
    <Kpi icon={<DollarSign/>} label="Vendas no período" value={money(totals.salesTotal)} note="Conforme filtro"/>
    <Kpi gold icon={<BarChart3/>} label="Lucro estimado" value={money(totals.profit)} note="Venda - custo"/>
    <Kpi icon={<Package/>} label="Peças vendidas" value={totals.sold} note="Unidades"/>
    <Kpi gold icon={<AlertTriangle/>} label="Estoque baixo" value={totals.low} note="Requer atenção"/>
  </div>
  <div className="actions"><button className="btn gold" onClick={()=>setModal({type:'sale'})}><ReceiptText/>Lançar Venda</button><button className="btn primary" onClick={()=>setModal({type:'product'})}><Plus/>Novo Produto</button><button className="btn light" onClick={()=>setModal({type:'client'})}><Users/>Novo Cliente</button></div>
  <div className="notice">{online?'☁️':'⚠️'} Sistema funcionando em modo <b>{online?'online':'local'}</b>. {online?'Todos os dados são salvos no Supabase.':'Configure as variáveis do Supabase na Vercel para salvar online.'}</div>
  <div className="two">
    <div className="panel"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h2 className="panelTitle">Vendas por período</h2><select className="input" style={{maxWidth:160}} value={period} onChange={e=>setPeriod(e.target.value)}><option value="hoje">Hoje</option><option value="7dias">7 dias</option><option value="mes">Este mês</option><option value="todos">Todos</option></select></div><ChartLine data={salesByDay}/></div>
    <div className="panel"><h2 className="panelTitle">Vendas por categoria</h2><ChartBar data={salesByCategory}/></div>
  </div>
  <div className="grid4">
    <Kpi icon={<ShoppingBag/>} label="Produtos cadastrados" value={products.length} note="Catálogo"/>
    <Kpi gold icon={<Users/>} label="Clientes" value={clients.length} note="Cadastrados"/>
    <Kpi icon={<CreditCard/>} label="A receber" value={money(totals.pending)} note="Compras a prazo"/>
    <Kpi gold icon={<CalendarDays/>} label="Atrasados" value={totals.overdue} note="Clientes em atraso"/>
  </div>
 </>
}

function Kpi({icon,label,value,note,gold}){return <div className="kpi"><div className={`kpiIcon ${gold?'gold':''}`}>{icon}</div><div><small>{label}</small><h3>{value}</h3><p>{note}</p></div></div>}

function ChartLine({data}){return <div style={{height:280}}><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip formatter={v=>money(v)}/><Line type="monotone" dataKey="vendas" stroke="#003D2E" strokeWidth={3}/><Line type="monotone" dataKey="lucro" stroke="#E5AD5C" strokeWidth={3}/></LineChart></ResponsiveContainer></div>}
function ChartBar({data}){return <div style={{height:280}}><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="categoria"/><YAxis/><Tooltip formatter={v=>money(v)}/><Bar dataKey="total" fill="#003D2E" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div>}

function Products({products,search,setSearch,setModal,deleteProduct,openCats,setOpenCats}){
 const grouped=products.reduce((a,p)=>{(a[p.category||'Sem categoria'] ||= []).push(p); return a;},{});
 return <div className="panel"><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><h2 className="panelTitle">Produtos</h2><div style={{display:'flex',gap:10}}><input className="input" placeholder="Buscar produto ou código" value={search} onChange={e=>setSearch(e.target.value)}/><button className="btn primary" onClick={()=>setModal({type:'product'})}><Plus/>Novo</button></div></div>
 {Object.entries(grouped).map(([cat,items])=><div key={cat}><button className="categoryHead" onClick={()=>setOpenCats(o=>({...o,[cat]:!o[cat]}))}><span>{cat}</span><span>{items.length} produtos</span></button>{openCats[cat]!==false&&<div className="tableWrap"><table><thead><tr><th>Código</th><th>Produto</th><th>Custo</th><th>Venda</th><th>Margem</th><th>Estoque</th><th>Ações</th></tr></thead><tbody>{items.map(p=><tr key={p.id}><td><b>{p.code}</b></td><td>{p.name}</td><td>{money(baseCost(p))}</td><td>{money(p.sale_price)}</td><td>{num(p.margin).toFixed(0)}%</td><td className={num(p.stock)<=num(p.min_stock)?'status bad':'status ok'}>{p.stock}</td><td><button className="iconBtn" onClick={()=>setModal({type:'product',product:p})}><Pencil/></button><button className="iconBtn" onClick={()=>deleteProduct(p.id)}><Trash2/></button></td></tr>)}</tbody></table></div>}</div>)}
 </div>
}

function Sales({sales,clients,setModal,period,setPeriod}){
 return <div className="panel"><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><h2 className="panelTitle">Vendas</h2><div style={{display:'flex',gap:10}}><select className="input" value={period} onChange={e=>setPeriod(e.target.value)}><option value="hoje">Hoje</option><option value="7dias">7 dias</option><option value="mes">Este mês</option><option value="todos">Todos</option></select><button className="btn gold" onClick={()=>setModal({type:'sale'})}><Plus/>Lançar Venda</button></div></div>
 <div className="tableWrap"><table><thead><tr><th>Data</th><th>Código</th><th>Produto</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Pendente</th><th>Status</th><th>Ações</th></tr></thead><tbody>{sales.map(s=><tr key={s.id}><td>{s.sale_date}</td><td>{s.product_code}</td><td>{s.product_name}</td><td>{s.client_name}</td><td>{money(s.total)}</td><td>{money(s.paid)}</td><td>{money(s.pending)}</td><td><span className={`status ${s.status==='pago'?'ok':'warn'}`}>{s.status}</span></td><td>{num(s.pending)>0&&<button className="btn light" onClick={()=>setModal({type:'payment',sale:s})}>Receber</button>}</td></tr>)}</tbody></table></div></div>
}

function Clients({clients,sales,setModal}){
 return <div className="panel"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><h2 className="panelTitle">Clientes / Crediário</h2><button className="btn primary" onClick={()=>setModal({type:'client'})}><UserPlus/>Novo Cliente</button></div>
 <div className="cards">{clients.map(c=><div className="clientCard" key={c.id}><h3>{c.name}</h3><p>{c.phone}</p><p>{c.notes}</p><div className="clientTotals"><div><small>Comprou</small><b>{money(c.total)}</b></div><div><small>Pagou</small><b>{money(c.paid)}</b></div><div><small>Falta</small><b style={{color:c.pending>0?'#b42318':'#087443'}}>{money(c.pending)}</b></div></div><div className="actions"><button className="btn light" onClick={()=>setModal({type:'client',client:c})}>Editar</button><button className="btn gold" onClick={()=>setModal({type:'clientAccount',client:c})}>Ver conta</button></div></div>)}</div></div>
}

function Categories({categories,setCategories,products}){
 const [name,setName]=useState('');
 return <div className="panel"><h2 className="panelTitle">Categorias</h2><div className="actions"><input className="input" style={{maxWidth:320}} placeholder="Nova categoria" value={name} onChange={e=>setName(e.target.value)}/><button className="btn primary" onClick={()=>{if(name&&!categories.includes(name))setCategories([...categories,name]);setName('')}}>Adicionar</button></div><div className="cards">{categories.map(c=><div className="clientCard" key={c}><h3>{c}</h3><p>{products.filter(p=>p.category===c).length} produtos</p></div>)}</div></div>
}
function Stock({products,setModal}){return <div className="panel"><h2 className="panelTitle">Estoque</h2><div className="tableWrap"><table><thead><tr><th>Produto</th><th>Código</th><th>Estoque</th><th>Mínimo</th><th>Status</th><th>Ações</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.code}</td><td>{p.stock}</td><td>{p.min_stock}</td><td><span className={`status ${num(p.stock)<=num(p.min_stock)?'bad':'ok'}`}>{num(p.stock)<=num(p.min_stock)?'Baixo':'Ok'}</span></td><td><button className="btn light" onClick={()=>setModal({type:'product',product:p})}>Ajustar</button></td></tr>)}</tbody></table></div></div>}
function Movements({sales,payments}){return <div className="panel"><h2 className="panelTitle">Movimentações</h2><div className="tableWrap"><table><thead><tr><th>Tipo</th><th>Data</th><th>Cliente/Produto</th><th>Valor</th></tr></thead><tbody>{[...sales.map(s=>({type:'Venda',date:s.sale_date,name:s.product_name,value:s.total})),...payments.map(p=>({type:'Pagamento',date:p.payment_date,name:p.client_name,value:p.amount}))].map((m,i)=><tr key={i}><td>{m.type}</td><td>{m.date}</td><td>{m.name}</td><td>{money(m.value)}</td></tr>)}</tbody></table></div></div>}
function Suppliers(){return <div className="panel"><h2 className="panelTitle">Fornecedores</h2><p>Cadastre fornecedores, contatos e observações nas próximas versões.</p></div>}
function Reports({totals,sales,clients}){return <div className="panel"><h2 className="panelTitle">Relatórios</h2><div className="grid4"><Kpi label="Vendas" value={money(totals.salesTotal)} note="Período" icon={<DollarSign/>}/><Kpi gold label="A receber" value={money(totals.pending)} note="Crediário" icon={<CreditCard/>}/><Kpi label="Clientes" value={clients.length} note="Cadastrados" icon={<Users/>}/><Kpi gold label="Atrasos" value={totals.overdue} note="Contas vencidas" icon={<AlertTriangle/>}/></div></div>}
function SettingsPage({online,products,sales,clients,payments}){
 function exportData(){const blob=new Blob([JSON.stringify({products,sales,clients,payments},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup-dolce-bella.json';a.click();}
 return <div className="panel"><h2 className="panelTitle">Configurações</h2><p>Status: <b>{online?'Online conectado ao Supabase':'Local no navegador'}</b></p><div className="actions"><button className="btn primary" onClick={exportData}><Download/>Baixar backup</button></div><p>Para salvar online, configure na Vercel: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.</p></div>
}

function Modal({modal,setModal,products,clients,sales,upsertProduct,registerSale,upsertClient,registerPayment,notifications}){
 const [form,setForm]=useState(modal.product || modal.client || modal.sale || {sale_date:today,quantity:1,payment:'Pix',paid:0});
 useEffect(()=>setForm(modal.product || modal.client || modal.sale || {sale_date:today,quantity:1,payment:'Pix',paid:0}),[modal]);
 function close(){setModal(null)}
 return <div className="modalBg"><div className="modal"><div className="modalHead"><h2 className="panelTitle">{title(modal.type)}</h2><button className="iconBtn" onClick={close}><X/></button></div>
  {modal.type==='product' && <ProductForm form={form} setForm={setForm} onSave={()=>upsertProduct(form)}/>}
  {modal.type==='sale' && <SaleForm form={form} setForm={setForm} clients={clients} onSave={()=>registerSale(form)}/>}
  {modal.type==='client' && <ClientForm form={form} setForm={setForm} onSave={()=>upsertClient(form)}/>}
  {modal.type==='payment' && <PaymentForm form={form} setForm={setForm} sale={modal.sale} onSave={()=>registerPayment({...form,sale_id:modal.sale.id})}/>}
  {modal.type==='notifications' && <div>{notifications.length?notifications.map((n,i)=><div className="notice" key={i}><AlertTriangle/>{n}</div>):<p>Nenhuma notificação.</p>}</div>}
  {modal.type==='clientAccount' && <ClientAccount client={modal.client} sales={sales} setModal={setModal}/>}
 </div></div>
}
function title(t){return {product:'Produto',sale:'Lançar Venda',client:'Cliente',payment:'Registrar pagamento',notifications:'Notificações',clientAccount:'Conta do cliente'}[t]||'Cadastro'}

function ProductForm({form,setForm,onSave}){
 const price=num(form.sale_price); const cost=baseCost(form); const margin=cost?((price-cost)/cost*100):0;
 return <div className="formGrid">
  <Field label="Código"><input className="input" value={form.code||''} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})}/></Field>
  <Field label="Produto"><input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
  <Field label="Categoria"><input className="input" value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/></Field>
  <Field label="Custo"><input className="input" type="number" value={form.cost||''} onChange={e=>setForm({...form,cost:e.target.value})}/></Field>
  <Field label="Extras"><input className="input" type="number" value={form.extra_cost||''} onChange={e=>setForm({...form,extra_cost:e.target.value})}/></Field>
  <Field label="Preço venda"><input className="input" type="number" value={form.sale_price||''} onChange={e=>setForm({...form,sale_price:e.target.value,margin:margin.toFixed(2)})}/></Field>
  <Field label="Margem"><input className="input" type="number" value={form.margin||margin.toFixed(2)} onChange={e=>{const m=num(e.target.value);setForm({...form,margin:e.target.value,sale_price:(baseCost(form)*(1+m/100)).toFixed(2)})}}/></Field>
  <Field label="Estoque"><input className="input" type="number" value={form.stock||''} onChange={e=>setForm({...form,stock:e.target.value})}/></Field>
  <Field label="Mínimo"><input className="input" type="number" value={form.min_stock||''} onChange={e=>setForm({...form,min_stock:e.target.value})}/></Field>
  <button className="btn primary" onClick={onSave}><Check/>Salvar</button>
 </div>
}
function SaleForm({form,setForm,clients,onSave}){return <div className="formGrid">
 <Field label="Código produto"><input className="input" value={form.code||''} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})}/></Field>
 <Field label="Cliente"><select className="input" value={form.client_id||''} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">Sem cliente</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
 <Field label="Quantidade"><input className="input" type="number" value={form.quantity||1} onChange={e=>setForm({...form,quantity:e.target.value})}/></Field>
 <Field label="Total"><input className="input" type="number" value={form.total||''} onChange={e=>setForm({...form,total:e.target.value})}/></Field>
 <Field label="Pago agora"><input className="input" type="number" value={form.paid||0} onChange={e=>setForm({...form,paid:e.target.value})}/></Field>
 <Field label="Vencimento"><input className="input" type="date" value={form.due_date||''} onChange={e=>setForm({...form,due_date:e.target.value})}/></Field>
 <Field label="Pagamento"><select className="input" value={form.payment||'Pix'} onChange={e=>setForm({...form,payment:e.target.value})}><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Crediário</option></select></Field>
 <Field label="Data"><input className="input" type="date" value={form.sale_date||today} onChange={e=>setForm({...form,sale_date:e.target.value})}/></Field>
 <button className="btn gold" onClick={onSave}><ReceiptText/>Confirmar venda</button>
 </div>}
function ClientForm({form,setForm,onSave}){return <div className="formGrid"><Field label="Nome"><input className="input" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Telefone/WhatsApp"><input className="input" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Observações"><textarea className="textarea" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></Field><button className="btn primary" onClick={onSave}><Check/>Salvar cliente</button></div>}
function PaymentForm({form,setForm,sale,onSave}){return <div><div className="notice">Recebendo de {sale.client_name}: falta {money(sale.pending)}</div><div className="formGrid"><Field label="Valor"><input className="input" type="number" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})}/></Field><Field label="Data"><input className="input" type="date" value={form.payment_date||today} onChange={e=>setForm({...form,payment_date:e.target.value})}/></Field><Field label="Forma"><select className="input" value={form.method||'Pix'} onChange={e=>setForm({...form,method:e.target.value})}><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></Field><button className="btn primary" onClick={onSave}>Registrar</button></div></div>}
function ClientAccount({client,sales,setModal}){const cs=sales.filter(s=>s.client_id===client.id||s.client_name===client.name);return <div><h3>{client.name}</h3><div className="tableWrap"><table><thead><tr><th>Data</th><th>Produto</th><th>Total</th><th>Pago</th><th>Falta</th><th>Ação</th></tr></thead><tbody>{cs.map(s=><tr key={s.id}><td>{s.sale_date}</td><td>{s.product_name}</td><td>{money(s.total)}</td><td>{money(s.paid)}</td><td>{money(s.pending)}</td><td>{num(s.pending)>0&&<button className="btn light" onClick={()=>setModal({type:'payment',sale:s})}>Receber</button>}</td></tr>)}</tbody></table></div></div>}
function Field({label,children}){return <div className="field"><label>{label}</label>{children}</div>}

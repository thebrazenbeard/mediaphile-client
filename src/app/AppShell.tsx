import {NavLink,Routes,Route,useNavigate} from 'react-router-dom'
import type{ServerInfo}from '../api/types'
import {useAuth}from '../auth/AuthProvider'
import {Home}from '../library/Home'
import {Movies}from '../library/Movies'
import {Shows}from '../library/Shows'
import {Search}from '../library/Search'
import {ItemDetailPage}from '../item/ItemDetail'
import {Player}from '../playback/Player'
import {Settings}from '../settings/Settings'
import {useDPadNavigation}from '../navigation/useDPadNavigation'

const tabs=[['/','⌂','Home'],['/movies','▣','Movies'],['/tv','▤','TV Shows'],['/search','⌕','Search'],['/settings','⚙','Settings']] as const
export function AppShell({server}:{server:ServerInfo}){
 const {user,onLogout}=useAuth()
 const navigate=useNavigate()
 useDPadNavigation()
 return <div className="app-layout">
  <aside className="sidebar"><div className="logo" onClick={()=>navigate('/')} role="presentation"><span className="logo-symbol">M</span><div><strong>MEDIAPHILE</strong><small>YOUR PRIVATE CINEMA</small></div></div>
  <div className="sidebar-label">DISCOVER</div>
  <nav aria-label="Main navigation">{tabs.map(([to,icon,label])=><NavLink key={to} to={to} end={to==='/'} aria-label={label} title={label} data-focusable="true" className={({isActive})=>'nav-link'+(isActive?' active':'')}><span className="nav-icon" aria-hidden="true">{icon}</span><span className="nav-text">{label}</span></NavLink>)}</nav>
  <div className="sidebar-footer"><div className="connection-dot"/><span>LOCAL NETWORK</span><small>SERVER ONLINE</small></div>
  </aside>
  <div className="app-main"><header className="topbar"><div className="breadcrumbs"><span className="eyebrow">MEDIAPHILE /</span> <span>{server.name}</span></div><div className="topbar-right"><span className="server-badge">● PRIVATE SERVER</span><span className="user-bubble" title={user.username}>{user.username.slice(0,1).toUpperCase()}</span><button className="quiet-btn" data-focusable onClick={()=>void onLogout()}>Sign out</button></div></header>
  <main className="page"><Routes><Route path="/" element={<Home/>}/><Route path="/movies" element={<Movies/>}/><Route path="/tv" element={<Shows/>}/><Route path="/search" element={<Search/>}/><Route path="/item/:id" element={<ItemDetailPage/>}/><Route path="/play/:id" element={<Player/>}/><Route path="/settings" element={<Settings/>}/><Route path="*" element={<Home/>}/></Routes></main>
  </div>
 </div>
}

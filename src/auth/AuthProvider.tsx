import React, {createContext,useContext} from 'react'
import type {ApiClient} from '../api/client'
import type {User} from '../api/types'
export type AuthContextValue={api:ApiClient,user:User,onLogout:()=>void}
const Context=createContext<AuthContextValue|null>(null)
export function AuthProvider({value,children}:{value:AuthContextValue,children:React.ReactNode}){
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider missing');return value}

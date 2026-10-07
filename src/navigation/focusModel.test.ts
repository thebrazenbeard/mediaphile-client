import{describe,it,expect}from 'vitest'
import{nextFocus}from './focusModel'
const cells=[
{id:'a',left:0,top:0,width:100,height:100},
{id:'b',left:110,top:0,width:100,height:100},
{id:'c',left:0,top:110,width:100,height:100},
{id:'hidden',left:220,top:0,width:0,height:100}
]
describe('TV focus model',()=>{
 it('moves right and down deterministically',()=>{
  expect(nextFocus(cells,'a','ArrowRight')).toBe('b')
  expect(nextFocus(cells,'a','ArrowDown')).toBe('c')
 })
 it('excludes hidden or zero-area nodes',()=>expect(nextFocus(cells,'b','ArrowRight')).toBe('b'))
 it('retains focus if no directional target',()=>expect(nextFocus(cells,'a','ArrowLeft')).toBe('a'))
})

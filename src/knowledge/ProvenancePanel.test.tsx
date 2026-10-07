import{describe,it,expect}from 'vitest'
import{evidenceLabel}from './ProvenancePanel'
describe('provenance',()=>{
 it('keeps source evidence distinct from analysis',()=>{
   expect(evidenceLabel('derived_analysis')).toBe('Interpretive analysis')
   expect(evidenceLabel('filesystem_catalog')).toBe('Catalog fact')
   expect(evidenceLabel('derived_analysis')).not.toBe(evidenceLabel('filesystem_catalog'))
 })
 it('does not coerce unknown labels',()=>expect(evidenceLabel('future_class')).toBe('Unknown evidence class'))
})

import test from 'node:test';
import assert from 'node:assert/strict';
const mod=await import('../server/import.mjs').catch(()=>({}));
test('CSV quoted commas and line breaks survive and imported IDs deduplicate',()=>{
 assert.equal(typeof mod.parseImport,'function','Import is required');
 const csv='title,sender,content,id\r\n"PCB, assembly",buyer@example.com,"one\n""two""",100\r\n';
 const rows=mod.parseImport({text:csv,kind:'mic',site:'globalwellpcb.com',format:'csv'});
 assert.equal(rows[0].title,'PCB, assembly');assert.equal(rows[0].content,'one\n"two"');
 assert.equal(rows[0].id,mod.parseImport({text:csv,kind:'mic',site:'globalwellpcb.com',format:'csv'})[0].id);
 assert.throws(()=>mod.parseImport({text:'title\n"unterminated',kind:'mic',format:'csv'}),/CSV/);
});

test('backup restoration preserves record IDs and resource category',()=>{const record={id:'original-id',kind:'resources',site:'',title:'SEO reference',category:'seo',status:'new'};const rows=mod.parseImport({text:JSON.stringify({format:'mimo-backup-v1',records:[record]}),format:'json'});assert.equal(rows[0].id,record.id);assert.equal(rows[0].category,'seo');});

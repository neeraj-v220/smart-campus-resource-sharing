import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import net from 'node:net';
let child,tmp,base,port;
async function freePort(){return await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})})}
async function untilReady(){for(let i=0;i<80;i++){try{const r=await fetch(base+'/api/health');if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error('server did not start')}
before(async()=>{tmp=path.join(process.cwd(),'data','campus-test-'+randomBytes(5).toString('hex'));fs.mkdirSync(tmp,{recursive:true});port=await freePort();base=`http://127.0.0.1:${port}`;child=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),DB_PATH:path.join(tmp,'test.sqlite')},stdio:['ignore','pipe','pipe']});let childErr='';child.stderr.on('data',d=>childErr+=d);try{await untilReady()}catch(e){throw Error(e.message+' '+childErr)}});
after(()=>{child?.kill()});
async function register(name){const r=await fetch(base+'/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,email:`${name.toLowerCase()}@campus.edu`,password:'campus-password-123',role:'STUDENT',department:'Computing',terms:true})});assert.equal(r.status,200);const data=await r.json();return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:data.csrf,user:data.user}}
async function call(s,path,method='GET',body){const r=await fetch(base+path,{method,headers:{cookie:s.cookie,'content-type':'application/json',...(method==='GET'?{}:{'x-csrf-token':s.csrf})},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()}}
test('registration, matching and transaction workflow are persistent and access controlled',async()=>{
 const owner=await register('Owner'),borrower=await register('Borrower');
 const created=await call(owner,'/api/resources','POST',{title:'Field guide',description:'Campus ecology field guide in good shape',category:'Books',condition:'GOOD',mode:'BORROW',pickup:'North Library',maxDays:10});assert.equal(created.status,201);
 const req=await call(borrower,'/api/requests','POST',{title:'Need field guide',description:'Looking for the ecology guide for a class',category:'Books',intent:'BORROW',pickup:'North Library',durationDays:5});assert.equal(req.status,201);assert.equal(req.data.matches,1);
 const offers=await call(owner,'/api/offers');assert.equal(offers.data.items.length,1);const oid=offers.data.items[0].id;
 const unauthorized=await call(borrower,`/api/offers/${oid}/accept`,'POST',{});assert.equal(unauthorized.status,404);
 const accepted=await call(owner,`/api/offers/${oid}/accept`,'POST',{});assert.equal(accepted.status,201);const repeated=await call(owner,`/api/offers/${oid}/accept`,'POST',{});assert.equal(repeated.status,409);
 const tids=await call(borrower,'/api/transactions');assert.equal(tids.data.items.length,1);const tx=tids.data.items[0].id;
 assert.equal((await call(borrower,`/api/transactions/${tx}/handover`,'POST',{})).status,200);assert.equal((await call(owner,`/api/transactions/${tx}/handover`,'POST',{})).status,200);
 const chat=await call(owner,`/api/transactions/${tx}/messages`,'POST',{body:'Meet at the north entrance.'});assert.equal(chat.status,201);const history=await call(borrower,`/api/transactions/${tx}/messages`);assert.equal(history.data.items[0].body,'Meet at the north entrance.');
 assert.equal((await call(borrower,`/api/transactions/${tx}/return`,'POST',{})).status,200);assert.equal((await call(owner,`/api/transactions/${tx}/confirm-return`,'POST',{})).status,200);assert.equal((await call(borrower,`/api/transactions/${tx}/rate`,'POST',{stars:5,review:'Helpful'})).status,201);
 const listing=await call(owner,`/api/resources/${created.data.id}`);assert.equal(listing.data.resource.status,'AVAILABLE');
});
test('competing owners cannot both win one request',async()=>{
 const left=await register('OwnerLeft'),right=await register('OwnerRight'),requester=await register('Requester');
 for(const [owner,title] of [[left,'Shared notebook'],[right,'Second notebook']]){const r=await call(owner,'/api/resources','POST',{title,description:'Notes and reading material in good condition',category:'Concurrency',condition:'GOOD',mode:'BORROW',pickup:'Student Center',maxDays:8});assert.equal(r.status,201)}
 const req=await call(requester,'/api/requests','POST',{title:'Need class notes',description:'Looking for notes for the concurrency seminar',category:'Concurrency',intent:'BORROW',pickup:'Student Center',durationDays:3});assert.equal(req.data.matches,2);
 const leftOffers=(await call(left,'/api/offers')).data.items.filter(x=>x.request_id===req.data.id),rightOffers=(await call(right,'/api/offers')).data.items.filter(x=>x.request_id===req.data.id);assert.equal(leftOffers.length,1);assert.equal(rightOffers.length,1);
 const outcomes=await Promise.all([call(left,`/api/offers/${leftOffers[0].id}/accept`,'POST',{}),call(right,`/api/offers/${rightOffers[0].id}/accept`,'POST',{})]);assert.deepEqual(outcomes.map(x=>x.status).sort(),[201,409]);const txs=await call(requester,'/api/transactions');assert.equal(txs.data.items.filter(x=>x.request_id===req.data.id).length,1);
});
test('mutations require CSRF token and duplicate accounts are rejected',async()=>{const s=await register('Another');const r=await fetch(base+'/api/resources',{method:'POST',headers:{cookie:s.cookie,'content-type':'application/json'},body:JSON.stringify({})});assert.equal(r.status,403);const dupe=await fetch(base+'/api/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Another',email:'another@campus.edu',password:'campus-password-123',role:'STUDENT',department:'Computing',terms:true})});assert.equal(dupe.status,409)});





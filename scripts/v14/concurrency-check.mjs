import { spawn } from 'node:child_process';

export async function checkConcurrentProgress(container) {
  function sql(input) {
    return new Promise(resolve => {
      const child=spawn('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{stdio:['pipe','pipe','pipe']});
      let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
      const timeout=setTimeout(()=>child.kill('SIGTERM'),15000);
      child.on('error',error=>{clearTimeout(timeout);resolve({code:1,output:error.message});});
      child.on('close',code=>{clearTimeout(timeout);resolve({code,output});});child.stdin.end(input);
    });
  }
  const setup=await sql(`
    insert into auth.users(id) values('00000000-0000-4000-a000-000000000014');
    insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000014','00000000-0000-4000-a000-000000000014','Concurrency fixture');
    insert into cdl.items(id,library_id,media_type,title) values('00000000-0000-4000-c000-000000000014','00000000-0000-4000-b000-000000000014','tv','Fixture');
    insert into cdl.episodes(id,library_id,show_id,season_number,episode_number) values('00000000-0000-4000-e000-000000000014','00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',1,1);
  `);
  if(setup.code!==0)throw new Error(setup.output);
  const command=watched=>`begin; set local role authenticated;
    select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000014',true);
    select public.cdl_v14_save_episode_progress('00000000-0000-4000-b000-000000000014',gen_random_uuid(),'[{"episode_id":"00000000-0000-4000-e000-000000000014","revision":null,"watched":${watched},"watched_at":null}]');
    select pg_sleep(0.3); commit;`;
  const results=await Promise.all([sql(command(true)),sql(command(false))]);
  if(results.filter(r=>r.code===0).length!==1 || !results.some(r=>r.output.includes('Episode changed elsewhere')))throw new Error('Concurrent first writes did not reject exactly one stale update');
  const verify=await sql(`select (select count(*) from cdl.episode_progress)=1 and (select revision from cdl.episode_progress)=1 and (select count(*) from cdl.change_events)=1;`);
  if(verify.code!==0 || verify.output.trim()!=='t')throw new Error('Concurrent save left unexpected rows');
  console.log('PASS concurrent first-progress writes: one commit, one revision conflict, one audit event');
  const create=`begin; set local role authenticated;
    select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000014',true);
    select public.cdl_v14_create_item('00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000044','00000000-0000-4000-d000-000000000044','game','{"title":"Concurrent add","user_status":"Wishlist"}');
    select pg_sleep(0.3); commit;`;
  const created=await Promise.all([sql(create),sql(create)]);
  if(created.some(r=>r.code!==0))throw new Error('Concurrent identical creates did not both succeed: '+created.map(r=>r.output).join('\n'));
  const receipts=created.map(r=>r.output.split('\n').find(line=>line.startsWith('{')));
  if(!receipts[0] || receipts[0]!==receipts[1])throw new Error('Concurrent create receipts differ');
  const checked=await sql(`select
    (select count(*) from cdl.items where id='00000000-0000-4000-c000-000000000044')=1 and
    (select count(*) from cdl.change_events where entity_kind='create')=1 and
    (select count(*) from cdl.sync_outbox)=1;`);
  if(checked.code!==0 || checked.output.trim()!=='t')throw new Error('Concurrent create duplicated side effects');
  console.log('PASS concurrent identical creates: same receipt, one item, one audit, one outbox entry');
}

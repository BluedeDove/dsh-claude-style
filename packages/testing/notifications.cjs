'use strict'
const {check}=require('./lane.cjs')
const {waitForSkin,dismissOverlays}=require('./dsh-web.cjs')
const scope='/dsh-claude-style/notifications/'
const key='dsh-claude-notifications-v1'

// waitForFunction treats a Promise as truthy; evaluate awaits these browser APIs.
async function waitBrowserResult(page,read,arg,timeout=15000){
 const until=Date.now()+timeout
 do{
  const result=await page.evaluate(read,arg)
  if(result)return result
  await page.waitForTimeout(50)
 }while(Date.now()<until)
 const state=await page.evaluate(()=>({title:document.title,phase:notifyCtx.get('sessions').list.getSnapshot().phase,current:notifyCtx.get('uiSession').current.value.key,legacyCurrent:notifyCtx.get('sessions').list.getSnapshot().current,prefs:localStorage.getItem('dsh-claude-notifications-v1'),status:[...notifyCtx.get('uiSession').sessionStatus.getSnapshot()].map(([id,value])=>({id,running:value.running,pending:value.pendingInteraction?.key,unread:value.completionUnread}))}))
 throw new Error('Timed out waiting for the actual notification API result: '+JSON.stringify(state))
}

function notificationScenario(width) {
 return {
  script:'process', prompt:'提醒真实浏览器检查', viewport:{width,height:900},
  async beforeSend({page,notes}) {
   await page.context().grantPermissions(['notifications'],{origin:new URL(page.url()).origin})
   await page.route('**/plugins/**',async route=>{
    if(!route.request().url().includes('dsh-claude-style-maintained'))return route.continue()
    const response=await route.fetch(),body=await response.text()
    const instrumented=body.replace('return module.exports','const originalApply=module.exports.apply;module.exports={...module.exports,apply(ctx){ctx.inject(["uiSession","sessions","uiWorkspace"],s=>window.notifyCtx=s);return originalApply(ctx)}};return module.exports')
    if(instrumented===body)throw new Error('Notification instrumentation did not reach the plugin factory')
    await route.fulfill({response,body:instrumented})
   })
   await page.evaluate(({key})=>localStorage.setItem(key,JSON.stringify({enabled:true,complete:true,pending:true,title:true,system:true,sound:false})),{key})
   await page.reload();await waitForSkin(page);await dismissOverlays(page)
   await page.waitForFunction(()=>window.notifyCtx?.get('uiSession')?.sessionStatus)
   notes.initialTitle=await page.title()
  },
  async duringTurn({page,notes}) {
   await page.locator('[data-dsh-claude-stop-owned]:visible:not([inert] *)').waitFor()
   notes.id=await page.evaluate(()=>notifyCtx.get('uiSession').current.value.key)
   await page.evaluate(()=>notifyCtx.get('uiWorkspace').startSession())
   await page.waitForFunction(id=>notifyCtx.get('uiSession').current.value.key!==id,notes.id)
   await page.waitForFunction(id=>notifyCtx.get('uiSession').sessionStatus.getSnapshot().get(id)?.running===false,notes.id,{timeout:60000})
   notes.complete=await waitBrowserResult(page,async ({scope,id})=>{
    const worker=await navigator.serviceWorker.getRegistration(scope)
    if(!worker)return null
    const items=(await worker.getNotifications()).filter(item=>item.data?.sessionId===id&&item.tag.startsWith('dsh-claude:'))
    return items.length?{title:document.title,items:items.map(item=>({title:item.title,tag:item.tag,data:item.data}))}:null
   },{scope,id:notes.id})
   await page.evaluate(id=>notifyCtx.get('uiWorkspace').openSession(id),notes.id)
  },
  async afterTurn({page,notes}) {
   await page.waitForFunction(()=>!/^\[\d+ 项待查看 · DSH\]/u.test(document.title))
   notes.acknowledged=await page.evaluate(async scope=>(await (await navigator.serviceWorker.getRegistration(scope)).getNotifications()).length===0,scope)
   // Use the host's actual pending-interaction domain, shared by approvals and questions.
   await page.evaluate(id=>{
    const ui=notifyCtx.get('uiSession')
    window.publishReminderInput=ui.registerPendingInteraction(()=>100)
    window.releaseReminderInput=publishReminderInput({key:'qa-input-1',sessionId:id,kind:'question',payload:{}},()=>{})
   },notes.id)
   // Visible conversations remain quiet; move away before the next real publication.
   await page.waitForTimeout(200)
   notes.visibleQuiet=await page.evaluate(async scope=>(await (await navigator.serviceWorker.getRegistration(scope)).getNotifications()).length===0,scope)
   await page.evaluate(()=>notifyCtx.get('uiWorkspace').startSession())
   await page.waitForFunction(id=>notifyCtx.get('uiSession').current.value.key!==id,notes.id)
   await page.evaluate(id=>{releaseReminderInput();window.releaseReminderInput=publishReminderInput({key:'qa-input-2',sessionId:id,kind:'question',payload:{}},()=>{})},notes.id)
   notes.pending=await waitBrowserResult(page,async scope=>{
    const items=(await (await navigator.serviceWorker.getRegistration(scope)).getNotifications()).filter(item=>item.title.includes('需要确认'))
    return items.length?items.map(item=>item.title):null
   },scope)
   await page.evaluate(({key})=>{
    localStorage.setItem(key,JSON.stringify({enabled:false,system:true}))
    window.dispatchEvent(new StorageEvent('storage',{key}))
    releaseReminderInput()
   },{key})
   await waitBrowserResult(page,async scope=>(await (await navigator.serviceWorker.getRegistration(scope)).getNotifications()).length===0,scope)
   notes.disabledTitle=await page.title()
   await page.reload();await waitForSkin(page);await dismissOverlays(page)
   notes.reloadQuiet=await page.evaluate(async scope=>{
    const worker=await navigator.serviceWorker.getRegistration(scope)
    return !/^\[\d+ 项待查看 · DSH\]/u.test(document.title)&&(!worker||(await worker.getNotifications()).length===0)
   },scope)
  },
  async assert({notes,session}) {return [
   check('后台任务结束产生真实系统通知与标题提示',notes.complete?.items.length===1&&notes.complete.items[0].data.sessionId===notes.id&&notes.complete.title.startsWith('[1 项待查看 · DSH]'),JSON.stringify(notes.complete)),
   check('回到对话后清除提醒，正在观看时保持安静',notes.acknowledged&&notes.visibleQuiet),
   check('宿主待确认状态产生需要确认提醒',notes.pending?.length===1&&notes.pending[0].includes('需要确认'),JSON.stringify(notes.pending)),
   check('停用与重载不回放旧提醒',notes.reloadQuiet&&!notes.disabledTitle.startsWith('[')),
   check('控制台没有异常',session.problems.length===0,session.problems.slice(0,3).join(' | ')),
  ]},
 }
}
module.exports={notificationScenarios:{notificationsDesktop:notificationScenario(1440),notificationsPhone:notificationScenario(390)}}

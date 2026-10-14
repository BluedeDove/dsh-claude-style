'use strict'
const fs=require('node:fs'),path=require('node:path')
const {PNG}=require('pngjs')
const {check}=require('./lane.cjs')
const {waitForSkin,dismissOverlays}=require('./dsh-web.cjs')
const {sendPrompt,waitForTurn}=require('./prompt.cjs')
const {sanitizePage}=require('../../scripts/shared/privacy.cjs')

const nativeAttachmentsScenario={
  script:'greeting',prompt:'原生输入附件检查',viewport:{width:390,height:844},
  async beforeSend({page}) {
    await page.route('**/plugins/**',async route=>{
      if(!route.request().url().includes('dsh-claude-style-maintained'))return route.continue()
      const response=await route.fetch(),body=await response.text()
      await route.fulfill({response,body:body.replace('function apply(ctx) {','function apply(ctx) {window.attachmentCtx=ctx;')})
    })
    await page.evaluate(()=>localStorage.setItem('dsh-claude-style.native-input','on'))
    await page.reload();await waitForSkin(page);await dismissOverlays(page)
    await page.waitForSelector('.dsh-claude-native-input:visible')
  },
  async assert({page,session,out}) {
    const checks=[]
    await page.setViewportSize({width:1440,height:1000})
    const field=page.locator('.dsh-claude-native-input:visible:not([inert] *)')
    await field.fill('图片说明')
    const png=new PNG({width:120,height:80});png.data.fill(160)
    for(let at=3;at<png.data.length;at+=4)png.data[at]=255
    await session.context.grantPermissions(['clipboard-read','clipboard-write'])
    await page.evaluate(async base64=>{
      const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0))
      await navigator.clipboard.write([new ClipboardItem({'image/png':new Blob([bytes],{type:'image/png'})})])
    },PNG.sync.write(png).toString('base64'))
    await field.focus();await page.keyboard.press('Control+V')
    await page.waitForSelector('[data-composer-card][data-has-attachments="true"]')
    await page.keyboard.type('继续输入')
    await page.waitForTimeout(300)
    const pasted=await page.evaluate(()=>{
      const field=document.querySelector('.dsh-claude-native-input'),scroll=document.querySelector('[data-input-scroll]')
      const a=field.getBoundingClientRect(),b=scroll.getBoundingClientRect()
      return {field:[a.x,a.y,a.width,a.height],scroll:[b.x,b.y,b.width,b.height],focused:field===document.activeElement,draft:field.value,
        officialHidden:getComputedStyle(document.querySelector('[data-composer-input]')).visibility==='hidden'}
    })
    checks.push(check('粘贴图片后继续输入，文本框立即跟随输入槽并保持单一编辑区域',pasted.focused&&pasted.officialHidden&&pasted.draft==='图片说明继续输入'&&pasted.field.every((v,i)=>Math.abs(v-pasted.scroll[i])<=1.5),JSON.stringify(pasted)))
    await field.blur()
    await field.focus()
    const inserted=await page.evaluate(()=>{
      const id=JSON.parse(localStorage.getItem('dsh.sessions.current')).sessionId
      const scope=attachmentCtx.get('sessions').scope(id)
      const input=scope.get('conversation').input.for(scope)
      const span=input.actions.captureInsertion()
      return input.actions.insertText('\n> 引用内容\n',span)
    })
    await page.waitForFunction(()=>document.querySelector('.dsh-claude-native-input').value.includes('引用内容'))
    await page.locator('[data-composer-input]').evaluate(e=>e.focus())
    checks.push(check('外部引用通过宿主插入接口进入原生草稿，编辑器聚焦转到对应文本框',inserted&&(await field.inputValue()).includes('引用内容')&&await field.evaluate(e=>e===document.activeElement)))
    await sanitizePage(expression=>page.evaluate(expression))
    await page.screenshot({path:path.join(out,'native-pasted-image.png')})
    await sendPrompt(page,'发送图片附件检查')
    await page.waitForFunction(()=>document.querySelectorAll('[data-chat-flow-kind="user"]').length===2)
    await waitForTurn(page)
    await page.waitForFunction(()=>document.querySelectorAll('[data-chat-flow-kind="turn-tail"]').length>=2)
    const file=path.join(out,'attachment-check.txt');fs.writeFileSync(file,'file attachment layout test\n')
    const owner=page.locator('[data-composer-card]:not([inert] *)').filter({has:page.locator('.dsh-claude-native-input:visible:not([inert] *)')})
    await owner.locator('input[type="file"]').setInputFiles(file)
    await page.waitForSelector('[data-composer-card][data-has-attachments="true"]')
    await sendPrompt(page,'发送文件附件检查')
    await page.waitForFunction(()=>document.querySelectorAll('[data-chat-flow-kind="user"]').length===3)
    await waitForTurn(page)
    const card=page.locator('[data-chat-flow-kind="user"]').last().locator('[data-message-attachments] > span[title]')
    await card.waitFor({state:'visible'})
    const box=await card.boundingBox(),text=await card.innerText()
    checks.push(check('发送后的文本文件保留名称和类型大小，使用紧凑文件条',box.height<=44&&text.includes('attachment-check.txt')&&text.includes('TXT')&&await card.locator('img').count()===0,JSON.stringify({box,text})))
    await page.waitForFunction(()=>document.querySelector('[data-dsh-claude-send-ghost]')===null)
    await sanitizePage(expression=>page.evaluate(expression));await page.screenshot({path:path.join(out,'sent-file-row.png')})
    checks.push(check('控制台没有异常',session.problems.length===0,session.problems.slice(0,3).join(' | ')))
    return checks
  },
}
module.exports={nativeAttachmentsScenario}

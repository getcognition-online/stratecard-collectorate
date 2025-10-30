'use strict';
const CONFIG={DEBUG_ENABLED:true};
class Debug{static init(){if(!CONFIG.DEBUG_ENABLED)return;const p=document.createElement('div');p.textContent='Debug: Dev active';p.style.position='fixed';p.style.top='0';p.style.left='0';p.style.right='0';p.style.background='#16213e';p.style.color='#fff';p.style.padding='6px 10px';p.style.zIndex='9999';document.body.prepend(p);}}
document.addEventListener('DOMContentLoaded',()=>{Debug.init();setTimeout(()=>{document.getElementById('loading-screen').style.display='none';document.getElementById('game-container').style.display='block';},800);});
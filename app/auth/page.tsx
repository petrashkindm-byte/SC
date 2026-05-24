import { Suspense } from 'react'
import AuthLanding from '../AuthLanding'

const hashFlushScript = `
(function(){
  var h=location.hash;
  if(!h||h.indexOf('error')===-1)return;
  var p=new URLSearchParams(h.replace(/^#/,''));
  var c=p.get('error_code')||'';
  var d=decodeURIComponent((p.get('error_description')||'').replace(/\\+/g,' '));
  var msg='';
  if(c==='otp_expired'||d.toLowerCase().indexOf('expired')!==-1){
    msg='Ссылка из письма устарела. Нажмите «Забыли пароль?» и запросите новое письмо.';
  }else if(d){msg=d;}
  else if(p.get('error')==='access_denied'){msg='Ссылка недействительна. Запросите новое письмо.';}
  if(msg){try{sessionStorage.setItem('subcuro_auth_error',msg);}catch(e){}}
  history.replaceState(null,'','/auth');
})();
`

export default function AuthPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: hashFlushScript }} />
      <Suspense fallback={null}>
        <AuthLanding />
      </Suspense>
    </>
  )
}

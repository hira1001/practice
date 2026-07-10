(function(global){
'use strict';
const profiles={
'0-2':{expected:['ゲスト以外の文字列を表示'],required:[/print\s*\(/],functional:(code,run)=>{const r=run(code);return [!r.error,!!r.output.trim(),r.output.trim()!=='ゲスト']},advice:'表示内容を変数へ入れてからprintすると、後で再利用しやすくなります。'},
'0-3':{expected:['SOSを出力'],required:[/print\s*\(/],functional:(code,run)=>{const r=run(code);return [!r.error,r.output.trim()==='SOS']},advice:'エラーを直した後は、開始記号と終了記号を対で確認する習慣を付けましょう。'},
'0-4':{expected:['エンジン正常を出力'],required:[/print\s*\(/],functional:(code,run)=>{const r=run(code);return [!r.error,r.output.trim()==='エンジン正常']},advice:'出力文字列が今後変わるなら、messageのような変数へ切り出す方法もあります。'},
'0-5':{expected:['警告ログを出力'],required:[/print\s*\(/],functional:(code,run)=>{const r=run(code);return [!r.error,r.output.trim()==='燃料残量 20%']},advice:'コメントは「何をしているか」より「なぜ必要か」を書くと価値が高くなります。'},
'0-6':{expected:['3行を指定順で出力'],required:[/print\s*\(/],functional:(code,run)=>{const r=run(code);return [!r.error,r.output.trim()==='通信接続\nこちら探査船\n救援を要請します']},advice:'同じ形式の出力が増える場合は、メッセージをリストへまとめてループする設計へ発展できます。'},
'1-2':{expected:['Novaを変数経由で出力'],required:[/ship_name\s*=/,/print\s*\(\s*ship_name\s*\)/],functional:(code,run)=>{const r=run(code);return [!r.error,r.output.trim()==='Nova']},advice:'ship_nameは役割が分かる良い変数名です。この命名習慣を維持しましょう。'},
'1-3':{expected:['Miraを変数経由で出力'],required:[/pilot_name\s*=/,/print\s*\(\s*pilot_name\s*\)/],functional:(code,run)=>{const r=run(code);return [!r.error,r.output.trim()==='Mira']},advice:'似た変数名を扱うときは、エラーに出た名前と定義した名前を一文字ずつ比較すると効率的です。'},
'1-4':{expected:['数値80を変数経由で出力'],required:[/fuel\s*=\s*80/,/print\s*\(\s*fuel\s*\)/],functional:(code,run)=>{const r=run(code);return [!r.error,r.output.trim()==='80']},advice:'数値を文字列にしないことで、後から加減算や比較へ利用できます。'},
'1-5':{expected:['更新後の75を出力'],required:[/fuel\s*=\s*100/,/fuel\s*=\s*75/],functional:(code,run)=>{const r=run(code);return [!r.error,r.output.trim()==='75']},advice:'状態更新が増える場合は、なぜ値が変わったかを処理名や関数名で表すと追跡しやすくなります。'},
'1-6':{expected:['3状態を変数で管理して順番に出力'],required:[/ship\s*=/,/fuel\s*=/,/crew\s*=/],functional:(code,run)=>{const r=run(code);return [!r.error,r.output.trim()==='Orion\n72\n4']},advice:'関連する値が増えたら、辞書やクラスへまとめるとデータの関係を表現しやすくなります。'},
'2-2':{expected:['fuelに応じて警告'],required:[/if\s+fuel\s*</],functional:(code,run)=>{const r=run(code);const alt=run(code.replace(/fuel\s*=\s*10/,'fuel = 100'));return [!r.error,r.output.includes('補給が必要'),!alt.output.includes('補給が必要')]},advice:'境界値を意識し、しきい値の直前・ちょうど・直後を試すと条件ミスを発見しやすくなります。'},
'2-3':{expected:['正しいインデントで条件実行'],required:[/if.+:/,/\n\s+print/],functional:(code,run)=>{const r=run(code);return [!r.error,r.output.trim()==='緊急補給']},advice:'インデントは見た目ではなく処理の所属を示す文法です。同じブロックでは幅を統一しましょう。'},
'2-4':{expected:['oxygenが40未満なら警告'],required:[/if\s+oxygen\s*<\s*40/],functional:(code,run)=>{const a=run(code);const b=run(code.replace(/oxygen\s*=\s*30/,'oxygen = 60'));return [!a.error,a.output.trim()==='酸素不足',b.output.trim()==='']},advice:'入力値を変えても正しく動くため、固定出力ではなく条件による振る舞いを実装できています。'},
'2-5':{expected:['20以上と未満を分岐'],required:[/if\b/,/else\s*:/],functional:(code,run)=>{const low=run(code);const high=run(code.replace(/temperature\s*=\s*18/,'temperature = 25'));return [!low.error,low.output.trim()==='低温',high.output.trim()==='適温']},advice:'二者択一が明確です。基準値20に名前を付けると、意味と変更箇所がさらに分かりやすくなります。'},
'2-6':{expected:['燃料と天候の両方で着陸判定'],required:[/\band\b/,/if\b/,/else\s*:/],functional:(code,run)=>{const ok=run(code);const low=run(code.replace(/fuel\s*=\s*35/,'fuel = 10'));const bad=run(code.replace(/weather\s*=\s*["']clear["']/,'weather = "storm"'));return [!ok.error,ok.output.trim()==='着陸許可',low.output.trim()==='待機',bad.output.trim()==='待機']},advice:'条件が増える場合はcan_landのような真偽値へ分けると、判定の意味を読み取りやすくできます。'}
};
function ratioScore(items,max){if(!items.length)return max;return Math.round(items.filter(Boolean).length/items.length*max)}
function techReview(code,level){const positives=[],improvements=[];let score=20;const lines=code.split(/\r?\n/).filter(x=>x.trim());
const names=[...code.matchAll(/^\s*([A-Za-z_]\w*)\s*=/gm)].map(m=>m[1]);
const badNames=names.filter(n=>/^[a-z]$/.test(n)||['tmp','data','value'].includes(n));
if(names.length&&badNames.length===0)positives.push('変数名から役割を推測できます。');
if(badNames.length){score-=4;improvements.push('短すぎる変数名 '+badNames.join('、')+' を、値の役割が分かる名前へ変更しましょう。')}
if(lines.some(x=>x.length>88)){score-=2;improvements.push('長い行があります。処理や条件を分けると読みやすくなります。')}
const prints=(code.match(/print\s*\(/g)||[]).length;if(prints>4&&level>1){score-=2;improvements.push('似た出力が増えています。データをまとめて処理する方法を検討できます。')}
if(/if\s+(.+):\s*\n\s+print/.test(code))positives.push('条件と実行処理の関係が素直で読みやすいです。');
if(/#\s*(ここ|TODO|追加)/.test(code)){score-=1;improvements.push('作業用コメントが残っています。完成後は削除するか、理由を説明するコメントへ変えましょう。')}
if(code.includes('\t')){score-=2;improvements.push('タブと空白の混在を避け、インデントを統一しましょう。')}
if(lines.length<=8)positives.push('課題規模に対してコードが過度に複雑ではありません。');
return{score:Math.max(0,score),positives,improvements}}
function review({courseIndex,lessonIndex,code,run,lesson}){const p=profiles[courseIndex+'-'+lessonIndex];if(!p){return{passed:false,total:0,functional:0,requirements:0,technical:0,checks:[],positives:[],improvements:['評価プロファイルが未設定です。'],next:'教材管理者へ連絡してください。'}}
const func=p.functional(code,run);const req=p.required.map(r=>r.test(code));const functional=ratioScore(func,60);const requirements=ratioScore(req,20);const tech=techReview(code,courseIndex+1);const total=functional+requirements+tech.score;const passed=functional>=48&&requirements>=12&&!run(code).error;
const positives=[...tech.positives];if(func.every(Boolean))positives.unshift('複数の実行ケースで期待どおりに動作しました。');if(req.every(Boolean))positives.push('このステップで学ぶべき構文・考え方を使えています。');
const improvements=[...tech.improvements];if(!func.every(Boolean))improvements.unshift('一部の入力条件で期待結果になりません。境界値や別の入力でも確認してください。');if(!req.every(Boolean))improvements.push('出力だけでなく、指定された学習概念を使って要件を実現してください。');
return{passed,total,functional,requirements,technical:tech.score,checks:[...func,...req],positives:[...new Set(positives)],improvements:[...new Set(improvements)],next:p.advice,label:total>=95?'MASTER':total>=85?'EXCELLENT':passed?'CLEAR':'RETRY',expected:p.expected};}
global.CodeQuestReviewer={review,version:'1.0.0'};
})(window);

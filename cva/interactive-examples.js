/* Fictional, relation-authored inputs. All behavior comes from the common module. */
(function(global){
  'use strict';
  const note='작성한 가상 구조·수치입니다. 실제 시설·성능·관측 기록이 아닙니다.';
  const part=(id,title,body,x,y,z,role,detail)=>({id,title,body,x,y,z,role,detail:detail||body,source:note});
  const edge=(from,to,label)=>({from,to,label});
  const stage=(id,title,body,activeIds)=>({id,title:title.replace(/^\d{2} · /,''),body,activeIds});
  const model={kind:'capacity',unit:'Wh',capacity:120,perItem:8,count:6,maxCount:24};
  function entry(type,suffix,name,job,profile,density,props){
    return {id:type+'-'+suffix,type,name,job,caseLabel:suffix==='base'?'기존 콘텐츠':'새 콘텐츠',document:{schema:'cva.page.v2',title:name,description:job,profile,presentation:{density,measure:'wide'},modules:[{id:type+'-'+suffix+'-experience',type:'experience',variant:type,props:{eyebrow:'CVA / INTERACTIVE FIELD NOTES',title:name,body:job,items:[],edges:[],stages:[],model,helpLabel:'이 예시의 자료와 가정',help:note,...props}}]}};
  }
  const entries=[
    entry('spatial','base','바람을 읽는 관측 기지','안쪽을 열어 보고, 측정값이 기록으로 이어지는 길을 따라가세요.','forma','comfortable',{
      items:[
        part('sensor','바람 센서','바깥의 변화를 가장 먼저 받는 곳입니다.',-2,1,0,'input','센서 → 해석 장치 → 기록 보관함으로 이어지는 작성된 데이터 경로입니다.'),
        part('processor','해석 장치','센서가 보낸 값을 기록 가능한 단위로 바꿉니다.',0,.2,0,'process'),
        part('archive','기록 보관함','정리한 기록을 모아 다음 관측과 비교합니다.',2,.2,0,'storage'),
        part('antenna','전송 안테나','같은 기록을 외부 표시부로 보냅니다.',2,1.8,-1.6,'output'),
        part('battery','전원부','관측과 기록에 필요한 전원을 공급합니다.',0,.1,2,'support'),
        part('roof','보호 지붕','장치를 보호하지만 내부 연결을 가립니다. 내부 보기를 켜면 벗겨집니다.',0,2,0,'cover')
      ],
      edges:[edge('sensor','processor','측정값'),edge('processor','archive','기록'),edge('archive','antenna','전송'),edge('battery','processor','전원')],
      stages:[stage('receive','01 · 받아들이기','센서와 전원부가 관측의 시작을 준비합니다.',['sensor','battery']),stage('interpret','02 · 정리하기','해석 장치가 받은 값을 기록으로 연결합니다.',['processor','archive']),stage('share','03 · 이어 보내기','보관한 기록을 안테나에서 전달합니다.',['archive','antenna'])]
    }),
    entry('spatial','transfer','하나의 전시, 여러 갈래의 길','구역을 선택해 연결을 보고, 바뀐 동선 속에서 전체와 부분을 함께 읽으세요.','forma','comfortable',{
      items:[
        part('entry','입구','관람이 시작되는 공통 진입점입니다.',-3,0,0,'input'),
        part('intro','도입 전시','전체 주제를 소개한 뒤 두 전시실로 갈라집니다.',-1,0,0,'process'),
        part('light','빛의 방','도입 전시에서 선택할 수 있는 첫 번째 경로입니다.',1,0,-2,'process'),
        part('sound','소리의 방 · 어둠 속에서 천천히 듣는 작은 풍경','두 번째 경로는 소리의 변화를 따라갑니다.',1,0,2,'process'),
        part('commons','함께 머무는 곳','두 경로가 다시 만나 관람 경험을 나눕니다.',3,0,0,'storage'),
        part('exit','출구','모든 관람 경로의 마지막 지점입니다.',4,0,1.8,'output'),
        part('roof','전시관 덮개','실내 공간을 감싸는 개념적 덮개입니다.',1,2.2,0,'cover')
      ],
      edges:[edge('entry','intro','진입'),edge('intro','light','선택 A'),edge('intro','sound','선택 B'),edge('light','commons','합류'),edge('sound','commons','합류'),edge('commons','exit','마무리')],
      stages:[stage('arrive','01 · 들어서기','입구에서 도입 전시까지 같은 길을 걷습니다.',['entry','intro']),stage('choose','02 · 나뉘는 길','빛과 소리 중 어느 경로부터 볼지 고릅니다.',['intro','light','sound']),stage('meet','03 · 다시 만남','서로 다른 두 관람 경로가 한 장소에서 만납니다.',['light','sound','commons']),stage('leave','04 · 나가기','공통 공간을 거쳐 출구로 이어집니다.',['commons','exit'])]
    }),
    entry('story','base','해안에 남은 세 번의 빛','시간을 옮겨 보세요. 같은 풍경 안에서 지금 읽는 장소와 기록이 함께 바뀝니다.','elio','spacious',{
      items:[
        {id:'lighthouse',title:'먼 등대',body:'06:20 · 빛이 먼저 닿은 곳',detail:'안개가 걷히기 전, 등대의 윤곽이 먼저 드러났습니다. 관측자는 먼 기준점과 지금의 빛을 기록합니다.',image:'adaptive-coast',x:24,y:18,source:'대표 창작 삽화입니다. 위치는 그림 위의 해설 좌표이며 실측 지도가 아닙니다.'},
        {id:'path',title:'발밑의 젖은 바위',body:'13:40 · 시선이 가까워진 곳',detail:'낮에는 먼 등대 대신 발밑의 젖은 바위를 바라봅니다. 장면의 전환은 같은 풍경에서 주목하는 대상이 달라지는 것을 뜻합니다.',image:'adaptive-coast',x:18,y:66,source:note},
        {id:'sea',title:'기록을 남긴 수평선',body:'18:10 · 하루를 돌아보는 곳',detail:'저녁 기록은 아침과 같은 기준점을 다시 살펴봅니다. 단계의 간격은 실제 시간의 비례를 나타내지 않습니다.',image:'adaptive-coast',x:79,y:32,source:note}
      ],
      stages:[stage('dawn','01 · 아침의 기준점','먼 곳을 먼저 확인합니다.',['lighthouse']),stage('day','02 · 가까운 풍경','발밑으로 시선을 옮깁니다.',['path']),stage('evening','03 · 다시 바라보기','같은 풍경의 다른 시간을 읽습니다.',['sea'])]
    }),
    entry('story','transfer','눈 속의 온실을 여는 순서','다섯 관찰 지점을 따라 전체 공간에서 작은 기록으로 시선을 좁혀 보세요.','elio','spacious',{
      items:[
        {id:'approach',title:'눈길에서 전체를 본다',body:'01 · 접근',detail:'온실에 들어가기 전에 건물과 길의 관계를 확인합니다.',image:'adaptive-greenhouse',x:42,y:80,source:note},
        {id:'door',title:'문 앞에서 경계를 살핀다',body:'02 · 입구',detail:'바깥과 안쪽이 만나는 입구를 주목합니다. 이것은 창작 해설 순서입니다.',image:'adaptive-greenhouse',x:46,y:48,source:note},
        {id:'roofline',title:'유리 지붕에 쌓인 눈과 안쪽으로 번지는 작은 불빛',body:'03 · 상부',detail:'지붕의 선을 따라가면 건물의 범위가 드러납니다. 그림은 장면마다 새로 촬영한 기록이 아니라 동일한 대표 삽화입니다.',image:'adaptive-greenhouse',x:35,y:36,source:note},
        {id:'light',title:'따뜻한 창 쪽으로 이동한다',body:'04 · 내부의 단서',detail:'이번에는 빛이 새어 나오는 부분을 확인합니다. 실제 온실의 생육이나 안전을 판단하는 자료가 아닙니다.',image:'adaptive-greenhouse',x:28,y:44,source:note},
        {id:'record',title:'지나온 다리를 돌아본다',body:'05 · 정리',detail:'건물과 길, 다리의 관계를 다시 살펴봅니다. 마지막 단계에 도착한 것과 실제 점검을 완료한 것은 다릅니다.',image:'adaptive-greenhouse',x:80,y:60,source:note}
      ],
      stages:[stage('one','01 · 전체','어디에 있는지 먼저 봅니다.',['approach']),stage('two','02 · 경계','안과 밖의 경계를 찾습니다.',['door']),stage('three','03 · 위쪽','시선을 높여 봅니다.',['roofline']),stage('four','04 · 빛','안쪽의 단서를 봅니다.',['light']),stage('five','05 · 정리','관찰한 위치를 연결합니다.',['record'])]
    }),
    entry('simulation','base','밤의 관측을 위한 작은 예산','관측 횟수를 바꾸면 사용량과 남은 용량이 함께 변합니다. 어느 지점에서 한계에 닿을까요?','editor','comfortable',{
      items:[{id:'energy',title:'계산의 범위',body:'관측 한 번에 8Wh, 사용 가능한 용량은 120Wh로 가정합니다.',detail:'사용량 = 횟수 × 8Wh. 남은 용량 = 120Wh − 사용량. 기온·손실·대기 전력은 반영하지 않은 창작 계산 예시입니다.',source:note}],model
    }),
    entry('simulation','transfer','작은 전시를 놓는 너비','작품 수를 바꾸며 남는 공간을 확인하세요. 단위와 제한이 바뀌어도 같은 계산을 읽을 수 있습니다.','editor','comfortable',{
      items:[{id:'shelf',title:'배치의 가정',body:'선반 너비 180cm, 작품 하나와 간격이 차지하는 너비 32cm로 가정합니다.',detail:'필요 너비 = 작품 수 × 32cm. 남은 너비 = 180cm − 필요 너비. 높이·무게·실제 설치 안전을 평가하지 않는 창작 배치 예시입니다.',source:note}],model:{kind:'capacity',unit:'cm',capacity:180,perItem:32,count:4,maxCount:10}
    })
  ];
  global.CVA_EXAMPLES.entries.unshift(...entries);
})(window);

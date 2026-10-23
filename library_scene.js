// One renderer for editable lesson traces. ManimGX performs all animation drawing.
export const STEP_SECONDS=8;
export function sceneCode(lesson, onlyStep=null){
  const selected=onlyStep===null?lesson.steps:[lesson.steps[onlyStep]];
  const payload=JSON.stringify({id:lesson.id,steps:selected});
  const className='Lesson_'+lesson.id.replace(/[^a-zA-Z0-9_]/g,'_');
  return `import json
import math
import manimgx as m
m.config.background_color='#0c111a'
data=json.loads(${JSON.stringify(payload)})
COLORS={'active':'#f2ce73','done':'#b5f0d4','muted':'#68788f','warning':'#f59d94','':'#69a9ef'}
def color(state): return COLORS.get(state or '',COLORS[''])
def fitted(text,size,width,height=None):
    obj=m.Text(str(text),font_size=size)
    if obj.width>width: obj.scale(width/obj.width)
    if height is not None and obj.height>height: obj.scale(height/obj.height)
    return obj
class ${className}(m.Scene):
    def construct(self):
        previous=None
        for k,step in enumerate(data['steps']):
            self.next_section('Step '+str(k+1))
            group=m.VGroup()
            nodes=step.get('nodes',[])
            rows=step.get('rows',[])
            positions={}
            for node in nodes:
                x=(float(node['x'])-.5)*12
                y=(2.3-float(node['y'])*2.8) if rows else (2.5-float(node['y'])*5)
                positions[str(node['id'])]=[x,y,0]
            for edge in step.get('edges',[]):
                a=positions.get(str(edge['from'])); b=positions.get(str(edge['to']))
                if a is not None and b is not None:
                    dx=b[0]-a[0];dy=b[1]-a[1]
                    if abs(dx)+abs(dy)<.001: continue
                    fraction=min(.54/abs(dx) if dx else 100,.38/abs(dy) if dy else 100,.44)
                    start=[a[0]+dx*fraction,a[1]+dy*fraction,0]
                    end=[b[0]-dx*fraction,b[1]-dy*fraction,0]
                    edge_color=color(edge.get('state')) if edge.get('state') else '#68788f'
                    line=(m.Arrow(start,end,buff=0,max_tip_length_to_length_ratio=.15,color=edge_color,stroke_width=2) if edge.get('directed') else m.Line(start,end,color=edge_color,stroke_width=2))
                    group.add(line)
                    if edge.get('label'):
                        distance=math.hypot(dx,dy)
                        label=fitted(edge['label'],21,1.3).move_to([(a[0]+b[0])/2-dy/distance*.34,(a[1]+b[1])/2+dx/distance*.34,0])
                        group.add(label)
            for node in nodes:
                pos=positions[str(node['id'])]
                c=color(node.get('state'))
                box=m.Rectangle(width=1.05,height=.72,color=c,fill_opacity=.16,stroke_width=3).move_to(pos)
                label=fitted(node['label'],27,.92,.54).set_color(c).move_to(pos)
                group.add(box,label)
            for r,row in enumerate(rows):
                y=(-1.1-r*.92) if nodes else (1.7-r*1.8)
                label=fitted(row.get('label',''),30,11.8)
                label.move_to([-5.8+label.width/2,y+.62,0])
                group.add(label)
                items=row.get('items',[])
                spacing=min(1.65,11.4/max(1,len(items)))
                for i,item in enumerate(items):
                    x=(i-(len(items)-1)/2)*spacing
                    c=color(item.get('state'))
                    box=m.Rectangle(width=spacing*.9,height=.75,color=c,fill_opacity=.16,stroke_width=2).move_to([x,y,0])
                    value=fitted(item.get('text',''),36,spacing*.8,.56).set_color(c).move_to([x,y,0])
                    group.add(box,value)
            if not nodes and not rows:
                raise ValueError('Every lesson step needs a visual diagram')
            if previous is None: self.play(m.FadeIn(group),run_time=1.1)
            else: self.play(m.ReplacementTransform(previous,group),run_time=1.1)
            self.wait(6.9)
            previous=group
`;
}

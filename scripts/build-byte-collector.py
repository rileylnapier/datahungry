# Rebuild Byte's detachable collector using Blender's mesh and armature APIs.
# Creates a new scene without modifying any existing scene.
import bpy, bmesh, math, numpy as np
from pathlib import Path
ROOT=Path('/Users/rileylove/games/datahungry')
out=ROOT/'assets/models'; (ROOT/'art').mkdir(exist_ok=True)
scene=bpy.data.scenes.new('Byte Collectors Build');bpy.context.window.scene=scene
bpy.ops.import_scene.gltf(filepath=str(out/'byte-sandbox-v1.glb'))
body=next(o for o in scene.objects if o.type=='MESH');body.name='ByteBody'
bsdf=next(n for n in body.data.materials[0].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
img=bsdf.inputs['Base Color'].links[0].from_node.image
pixels=np.array(img.pixels[:]).reshape(img.size[1],img.size[0],4)
uv=body.data.uv_layers.active.data;picked=[]
for poly in body.data.polygons:
 colors=[]
 for li in poly.loop_indices:
  u,v=uv[li].uv;colors.append(pixels[min(img.size[1]-1,int(v*img.size[1])),min(img.size[0]-1,int(u*img.size[0])),:3])
 r,g,b=np.mean(colors,axis=0)
 if g>r*1.12 and b>r*1.02:picked.append(poly.index)
body['collector_faces']=picked
bm=bmesh.new();bm.from_mesh(body.data);bm.faces.ensure_lookup_table()
remove=[f for f in bm.faces if (f.index in set(body['collector_faces']) and f.calc_center_median().y>.15) or f.calc_center_median().x>.315]
bmesh.ops.delete(bm,geom=remove,context='FACES')
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00002)
boundary=[e for e in bm.edges if e.is_boundary]
patch=bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
repair=bpy.data.materials.new('Lavender attachment repair');repair.diffuse_color=(.57,.40,.70,1);repair.use_nodes=True
bsdf=next(n for n in repair.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
bsdf.inputs['Base Color'].default_value=(.57,.40,.70,1);bsdf.inputs['Roughness'].default_value=.65
body.data.materials.append(repair)
for f in patch.get('faces',[]):f.material_index=len(body.data.materials)-1
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(body.data);bm.free();del body['collector_faces']
for o in bpy.context.scene.objects:o.select_set(False)
body.select_set(True);bpy.context.view_layer.objects.active=body
# export_format is a dynamic enum; query through the Python operator doc.
print(bpy.ops.export_scene.gltf.__doc__.split('export_format=')[1][:100])
bpy.ops.export_scene.gltf(filepath=str(out/'byte-body-v2.glb'),use_selection=True,use_active_scene=True,export_animations=False)

# One mesh, four materials, nine deform bones. Bone heads run along Blender -Y
# (glTF +Z). The game bends the chain toward real targets instead of a fixed clip.
def material(name,color,glow=0):
 m=bpy.data.materials.new(name);m.use_nodes=True
 p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.38
 p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=glow
 return m
mats=[material('Collector teal',(.075,.29,.29)),material('Collector shell',(.58,.79,.68)),material('Collector intake',(.014,.055,.063)),material('Collector indicator',(.53,.96,.65),.6)]
verts=[];faces=[];slots=[];weights=[]
N=9;L=.72;SIDES=16
def lathe(profile,slot,rigid=False):
 start=len(verts)
 for z,r in profile:
  for i in range(SIDES):
   a=i*2*math.pi/SIDES;verts.append((r*math.cos(a),-z,r*math.sin(a)))
   t=max(0,min(N-1,z/L*(N-1)))
   lo=min(N-2,int(t));weights.append([(lo,1-(t-lo)),(lo+1,t-lo)] if not rigid else [(N-1,1)])
 for j in range(len(profile)-1):
  for i in range(SIDES):
   faces.append((start+j*SIDES+i,start+j*SIDES+(i+1)%SIDES,start+(j+1)*SIDES+(i+1)%SIDES,start+(j+1)*SIDES+i));slots.append(slot)
# Soft corrugated hose, and a short hollow flared vacuum head.
lathe([(j*L/48,.036+(.003 if j%2 else 0)) for j in range(49)],0)
lathe([(.70,.042),(.72,.062),(.76,.07),(.83,.105),(.87,.11),(.89,.105),(.89,.079),(.85,.071),(.77,.032)],1,True)
lathe([(.89,.105),(.895,.103),(.895,.079),(.89,.079)],3,True)
lathe([(.77,.032),(.775,0)],2,True)
lathe([(.718,.064),(.731,.066),(.741,.063)],0,True)
mesh=bpy.data.meshes.new('Collector mesh');mesh.from_pydata(verts,[],faces);mesh.update()
hose=bpy.data.objects.new('Collector',mesh);bpy.context.collection.objects.link(hose)
for m in mats:mesh.materials.append(m)
for p,slot in zip(mesh.polygons,slots):
 p.material_index=2 if slot==1 and .77<-p.center.y<.88 and p.center.x*p.center.x+p.center.z*p.center.z<.075**2 else slot
 p.use_smooth=True
# Recalculate normals once after constructing the lathed surfaces.
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
arm=bpy.data.armatures.new('Collector skeleton');rig=bpy.data.objects.new('CollectorRig',arm);bpy.context.collection.objects.link(rig)
for o in bpy.context.scene.objects:o.select_set(False)
rig.select_set(True);bpy.context.view_layer.objects.active=rig
mode_ids=[i.identifier for i in bpy.ops.object.mode_set.get_rna_type().properties['mode'].enum_items]
bpy.ops.object.mode_set(mode=next(i for i in mode_ids if i=='EDIT'))
for i in range(N):
 bone=arm.edit_bones.new('Hose_%02d'%i);bone.head=(0,-L*i/(N-1),0);bone.tail=(0,-L*i/(N-1)-.09,0)
bpy.ops.object.mode_set(mode=next(i for i in mode_ids if i=='OBJECT'))
groups=[hose.vertex_groups.new(name='Hose_%02d'%i) for i in range(N)]
for vi,ws in enumerate(weights):
 for i,w in ws:
  if w>0:groups[i].add([vi],w,'REPLACE')
modifier_ids=[i.identifier for i in bpy.types.Modifier.bl_rna.properties['type'].enum_items]
mod=hose.modifiers.new('Flexible collector',next(i for i in modifier_ids if i=='ARMATURE'));mod.object=rig
hose.parent=rig;rig.show_in_front=True
rig.select_set(True);hose.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'byte-collector-v1.glb'),use_selection=True,use_active_scene=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/byte-collectors.blend'),copy=True)
print('EXPORTED',[(p.name,p.stat().st_size) for p in [out/'byte-body-v2.glb',out/'byte-collector-v1.glb']])


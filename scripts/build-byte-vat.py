"""Run in Blender to prepare the Meshy hardware without touching other scenes."""
import bpy, bmesh, math
from mathutils import Vector, Matrix
from pathlib import Path

ROOT = Path('/Users/rileylove/games/datahungry')
scene = bpy.data.scenes.get('Byte Vat Assembly') or bpy.data.scenes.new('Byte Vat Assembly')
bpy.context.window.scene = scene
for obj in list(scene.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'art/meshy-vat-v1/byte-vat-raw-v1.glb'))
source = next(o for o in scene.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = source
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
verts = [v.co.copy() for v in source.data.vertices]
floor = min(v.z for v in verts)
scale = 1.8 / max(max(v[i] for v in verts)-min(v[i] for v in verts) for i in (0,1))
parts = []
for upper, name in [(False, 'Vat_Chassis'), (True, 'Vat_Lid')]:
    obj = source.copy()
    obj.data = source.data.copy()
    scene.collection.objects.link(obj)
    obj.name = name
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if (v.co.z > 0) != upper], context='VERTS')
    # Weld export seams geometrically; UV data remains per face corner.
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.00001)
    for v in bm.verts:
        v.co.z -= floor
        v.co *= scale
        if upper:
            v.co.z += .32
        v.co = Matrix.Rotation(math.pi/4, 3, 'Z') @ v.co
    bm.to_mesh(obj.data)
    bm.free()
    parts.append(obj)
bpy.data.objects.remove(source, do_unlink=True)
# Clean basin insert covers the noisy generated interior without changing the exterior.
mat = bpy.data.materials.new('Vat Basin Teal')
mat.diffuse_color = (.045,.19,.21,1)
mat.use_nodes = True
shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
shader.inputs['Base Color'].default_value = (.045,.19,.21,1)
shader.inputs['Roughness'].default_value = .32
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=.738, depth=.025, location=(0,0,.635))
basin = bpy.context.object
basin.name = 'Vat_Basin'
basin.data.materials.append(mat)
parts.append(basin)
bpy.ops.object.select_all(action='DESELECT')
for obj in parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'assets/models/byte-vat-v1.glb'), export_format='GLB', use_selection=True, use_active_scene=True)
print('Exported vat hardware:', [(o.name, len(o.data.polygons)) for o in parts])

# Assembly references stay editable in Blender; only hardware is exported above.
before = set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/models/byte-body-v2.glb'))
brain_parts = [o for o in scene.objects if o not in before and o.type == 'MESH']
points = [o.matrix_world @ Vector(c) for o in brain_parts for c in o.bound_box]
lo = Vector(tuple(min(v[i] for v in points) for i in range(3)))
hi = Vector(tuple(max(v[i] for v in points) for i in range(3)))
center = (lo+hi)/2
brain_scale = 1.25/max(hi-lo)
for obj in brain_parts:
    for v in obj.data.vertices:
        v.co = (obj.matrix_world @ v.co-center)*brain_scale+Vector((0,0,1.17))
    obj.matrix_world = Matrix.Identity(4)
    obj.name = 'Byte_Floating_Reference'

def lathe(name, profile, color, alpha):
    vertices, faces = [], []
    for r,z in profile:
        for j in range(64):
            a = j*math.tau/64
            vertices.append((r*math.cos(a),r*math.sin(a),z))
    for i in range(len(profile)-1):
        for j in range(64):
            k=(j+1)%64
            faces.append((i*64+j,i*64+k,(i+1)*64+k,(i+1)*64+j))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    obj=bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(obj)
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Alpha'].default_value=alpha
    shader.inputs['Roughness'].default_value=.12
    obj.data.materials.append(mat)
    for p in mesh.polygons:p.use_smooth=True
    return obj

profile=[(.747,.63),(.765,.70),(.775,.86),(.77,1.10),(.74,1.32),(.68,1.51),(.57,1.67),(.45,1.752)]
lathe('Glass_Reference',profile,(.55,.8,.85),.115)
lathe('Liquid_Reference',[(r-.022,z) for r,z in profile if z<1.63]+[(.582,1.63),(0,1.63)],(.35,.4,.8),.18)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/byte-vat.blend'))

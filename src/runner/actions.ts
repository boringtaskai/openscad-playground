// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { getParentDir } from '../fs/filesystem';
import { spawnOpenSCAD } from "./openscad-runner";
import { processMergedOutputs } from "./output-parser";
import { AbortablePromise, turnIntoDelayableExecution } from '../utils';
import { ParameterSet } from '../state/customizer-types';

const parseSTL = require('parse-stl');

const syntaxDelay = 300;

type SyntaxCheckOutput = {logText: string, markers: monaco.editor.IMarkerData[], parameterSet?: ParameterSet};
export const checkSyntax =
  turnIntoDelayableExecution(syntaxDelay, (source: string, sourcePath: string) => {
    // const timestamp = Date.now(); 
    
    source = '$preview=true;\n' + source;

    const outFile = 'out.json';
    const job = spawnOpenSCAD({
      inputs: [[sourcePath, source + '\n']],
      args: [sourcePath, "-o", outFile, "--export-format=param"],
      // workingDir: sourcePath.startsWith('/') ? getParentDir(sourcePath) : '/home'
      outputPaths: [outFile],
    });

    return AbortablePromise<SyntaxCheckOutput>((res, rej) => {
      (async () => {
        try {
          const result = await job;
          // console.log(result);

          let parameterSet: ParameterSet | undefined = undefined;
          if (result.outputs && result.outputs.length == 1) {
            let [[, content]] = result.outputs;
            content = new TextDecoder().decode(content as any);
            try {
              parameterSet = JSON.parse(content)
              // console.log('PARAMETER SET', JSON.stringify(parameterSet, null, 2))
            } catch (e) {
              console.error(`Error while parsing parameter set: ${e}\n${content}`);
            }
          } else {
            console.error('No output from runner!');
          }

          res({
            ...processMergedOutputs(result.mergedOutputs, {shiftSourceLines: {
              sourcePath,
              skipLines: 1,
            }}),
            parameterSet,
          });
        } catch (e) {
          console.error(e);
          rej(e);
        }
      })()
      return () => job.kill();
    });
  });

let renderDelay = 1000;
export type RenderOutput = {stlFile: File, logText: string, markers: monaco.editor.IMarkerData[], elapsedMillis: number, totalPrice: number, currency: string}

export type RenderArgs = {
  source: string,
  sourcePath: string,
  vars?: {[name: string]: any},
  features?: string[],
  extraArgs?: string[],
  isPreview: boolean
}

export type Coordinate3D = {
  x: number;
  y: number;
  z: number;
}

function formatValue(any: any): string {
  if (typeof any === 'string') {
    return `"${any}"`;
  } else if (any instanceof Array) {
    return `[${any.map(formatValue).join(', ')}]`;
  } else {
    return `${any}`;
  }
}

//function used for calculating volume
function signedVolumeOfTriangle(p1:Coordinate3D, p2:Coordinate3D, p3:Coordinate3D) : number {
  let v321 = p3.x*p2.y*p1.z;
  let v231 = p2.x*p3.y*p1.z;
  let v312 = p3.x*p1.y*p2.z;
  let v132 = p1.x*p3.y*p2.z;
  let v213 = p2.x*p1.y*p3.z;
  let v123 = p1.x*p2.y*p3.z;
  return (-v321 + v231 + v312 - v132 - v213 + v123)/6;
}

function calculateVolume(positions: any) : number {
  let objectPolygons = positions.length;
  if (objectPolygons <= 0) {
    return 0;
  }

  //calculations against newly parsed mesh data
  let objectVolume = 0;
  let dimensionSet = {bottom: 0, top:0, diff: 0};
  let dimensions = [];
  dimensions[0] = dimensionSet; //x
  dimensions[1] = dimensionSet; //y
  dimensions[2] = dimensionSet; //z

  for(let i=0;i<objectPolygons; i+=3)
  {
      let t1: Coordinate3D = {
        x: positions[i+0][0],
        y: positions[i+0][1],
        z: positions[i+0][2]
      }

      let t2: Coordinate3D = {
        x: positions[i+1][0],
        y: positions[i+1][1],
        z: positions[i+1][2]
      }

      let t3: Coordinate3D = {
        x: positions[i+2][0],
        y: positions[i+2][1],
        z: positions[i+2][2]
      }

      //turn up the volume
      objectVolume += signedVolumeOfTriangle(t1,t2,t3);

      //get maximum vertex range to calculate bounding box
      for(let j=0;j<3;j++){
          for(let k=0;k<3;k++) {
              if (dimensions[j].top < positions[i + k][j]) {
                  dimensions[j].top = positions[i + k][j]
              }
              if (dimensions[j].bottom > positions[i + k][j]) {
                  dimensions[j].bottom = positions[i + k][j]
              }
          }
      }
  }

  objectVolume =objectVolume*0.001;

  return objectVolume;

}

async function blobPartsToBuffer(blob: Blob): Promise<Buffer> {
  // Convert Blob to ArrayBuffer
  const arrayBuffer = await blob.arrayBuffer();

  // Create a Buffer from the ArrayBuffer
  return Buffer.from(arrayBuffer);
}

async function calculatePrice(blob: Blob): Promise<number> {
  let totalPrice = 0;
  let buffer = await blobPartsToBuffer(blob);
  let mesh = parseSTL(buffer);
  let positions = mesh.positions;

  let volume = calculateVolume(positions);

  // calculate the price
  let weight = 1.25 * volume;
 
  let filamentPrice = 157000;
  let materialCostPerGr = filamentPrice / 1000;
  let printCostPerHour = 1000;
  let printSpeed = 500;
  let printDuration = (volume * volume * volume / printSpeed) / 24;

  totalPrice  = (materialCostPerGr * weight) + (printCostPerHour * (printDuration / 3600))
  console.log("Weight: " + weight + ", Volume: " + volume + ", Duration: " + printDuration + ", Total Price: " + totalPrice);

  return totalPrice;
}

export const render =
 turnIntoDelayableExecution(renderDelay, ({sourcePath, source, isPreview, vars, features, extraArgs}: RenderArgs) => {

    const prefixLines: string[] = [];
    if (isPreview) {
      prefixLines.push('$preview=true;');
    }
    source = [...prefixLines, source].join('\n');

    const args = [
      sourcePath,
      "-o", "out.stl",
      "--export-format=binstl",
      ...(Object.entries(vars ?? {}).flatMap(([k, v]) => [`-D${k}=${formatValue(v)}`])),
      ...(features ?? []).map(f => `--enable=${f}`),
      ...(extraArgs ?? [])
    ]
    
    const job = spawnOpenSCAD({
      // wasmMemory,
      inputs: [[sourcePath, source]],
      args,
      outputPaths: ['out.stl'],
      // workingDir: sourcePath.startsWith('/') ? getParentDir(sourcePath) : '/home'
    });

    return AbortablePromise<RenderOutput>((resolve, reject) => {
      (async () => {
        try {
          const result = await job;
          console.log(result);

          const {logText, markers} = processMergedOutputs(result.mergedOutputs, {
            shiftSourceLines: {
              sourcePath: sourcePath,
              skipLines: prefixLines.length
            }
          });
    
          if (result.error) {
            reject(result.error);
          }
          
          const [output] = result.outputs ?? [];
          if (!output) {
            reject(new Error('No output from runner!'));
            return;
          }
          const [filePath, content] = output;
          const filePathFragments = filePath.split('/');
          const fileName = filePathFragments[filePathFragments.length - 1];

          // TODO: have the runner accept and return files.
          const blob = new Blob([content], { type: "application/octet-stream" });
          
          let totalPrice = 0;
          calculatePrice(blob).then(price => {
            console.log('Total Price: ' + price);
            totalPrice = Number(price.toFixed(0));

            // console.log(new TextDecoder().decode(content));
            const stlFile = new File([blob], fileName);
            resolve({stlFile, logText, markers, elapsedMillis: result.elapsedMillis, totalPrice: totalPrice, currency: 'Rp. '});
          });

          
        } catch (e) {
          console.error(e);
          reject(e);
        }
      })();

      return () => job.kill()
    });
  });

// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { ParameterSet } from './customizer-types';

export type MultiLayoutComponentId = 'viewer' | 'customizer';
export type SingleLayoutComponentId = MultiLayoutComponentId;

export interface State {
  params: {
    sourcePath: string,
    source: string,
    vars?: {[name: string]: any},
    features: string[],
  },

  view: {
    logs?: boolean,
    layout: {
      mode: 'single',
      focus: SingleLayoutComponentId,
    } | ({
      mode: 'multi',
    } & { [K in MultiLayoutComponentId]: boolean })

    collapsedCustomizerTabs?: string[],
    
    color: string,
    showAxes?: boolean,
    showShadows?: boolean,
    lineNumbers?: boolean,
  }

  lastCheckerRun?: {
    logText: string,
    markers: monaco.editor.IMarkerData[]
  }
  rendering?: boolean,
  previewing?: boolean,
  checkingSyntax?: boolean,

  parameterSet?: ParameterSet,
  error?: string,
  output?: {
    isPreview: boolean,
    stlFile: File,
    stlFileURL: string,
    elapsedMillis: number,
    formattedElapsedMillis: string,
    formattedStlFileSize: string,
    totalPrice: number,
    currency: string,
    // path: string,
    // timestamp: number,
    // sizeBytes: number,
    // formattedSize: string,
  },
};

export interface StatePersister {
  set(state: State): Promise<void>;
}

export {}
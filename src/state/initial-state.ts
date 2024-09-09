// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import defaultScad from './default-scad';
import { State } from './app-state';

export const defaultSourcePath = '/playground.scad';
export const defaultModelColor = '#ffffff';
  
export const blankProjectState: State = {
  params: {
    sourcePath: defaultSourcePath,
    source: '',
    features: [],
  },
  view: {
    color: defaultModelColor,
    layout: {
      mode: 'single',
      focus: 'viewer'
    }
  }
};

export function createInitialState(fs: any, state: State | null) {

  type Mode = State['view']['layout']['mode'];
  const mode: Mode = window.matchMedia("(min-width: 768px)").matches 
    ? 'multi' : 'single';

  const initialState: State = {
    params: {
      sourcePath: defaultSourcePath,
      source: defaultScad,
      features: [],
    },
    view: {
      layout: {
        mode: 'multi',
        viewer: true,
        customizer: false,
      } as any,

      color: defaultModelColor,
    },
    ...(state ?? {})
  };

  if (initialState.view.layout.mode != mode) {
    if (mode === 'multi' && initialState.view.layout.mode === 'single') {
      initialState.view.layout = {
        mode,
        viewer: true,
        customizer: initialState.view.layout.focus == 'customizer'
      }
    } else if (mode === 'single' && initialState.view.layout.mode === 'multi') {
      initialState.view.layout = {
        mode,
        focus: initialState.view.layout.viewer ? 'viewer'
          : 'customizer'
      }
    }
  }

  initialState.view.showAxes ??= false
  initialState.view.showShadows ??= false

  fs.writeFile(initialState.params.sourcePath, initialState.params.source);
  if (initialState.params.sourcePath !== defaultSourcePath) {
    fs.writeFile(defaultSourcePath, defaultScad);
  }
  
  const defaultFeatures = ['manifold', 'fast-csg', 'lazy-union'];
  defaultFeatures.forEach(f => {
    if (initialState.params.features.indexOf(f) < 0)
    initialState.params.features.push(f);
  });

  return initialState;
}


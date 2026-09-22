import {makeFeature, unusedFeature} from './feature.js'
import './startup.js'

globalThis.__bundleTrace = {run: makeFeature(), unusedFeature}

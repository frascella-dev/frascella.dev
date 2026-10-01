/**
 * Portfolio: one view per menu item, chosen by `data-view` — the same shape as the owner's
 * other plugins (Agenda, Voci, Postino, Chiaro). Data comes from the `frascella/v1/admin` API.
 */
import { createRoot } from '@wordpress/element';
import domReady from '@wordpress/dom-ready';

import Projects from './views/Projects';
import Settings from './views/Settings';
import './admin.scss';

const VIEWS = { projects: Projects, settings: Settings };

domReady( () => {
	const mount = document.getElementById( 'frascella-app' );
	if ( mount ) {
		const View = VIEWS[ mount.dataset.view ] || Projects;
		createRoot( mount ).render( <View /> );
	}
} );

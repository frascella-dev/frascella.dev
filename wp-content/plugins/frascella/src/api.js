import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

const ROOT = '/frascella/v1/admin';

export const config = window.frascellaAdmin || {};

/** The admin user's locale, as WordPress declares it on <html> (e.g. "it-IT"). */
export const locale = document.documentElement.lang || 'en-US';

export function api( path, { method = 'GET', data } = {} ) {
	return apiFetch( { path: ROOT + path, method, data } );
}

/** The API's error message, or a generic one when the server gave none. */
export function errorMessage( error ) {
	return error?.message || __( 'Something went wrong. Please try again.', 'frascella' );
}

export function formatDate( seconds ) {
	if ( ! seconds ) {
		return '—';
	}
	return new Intl.DateTimeFormat( locale, { day: 'numeric', month: 'short', year: 'numeric' } ).format( new Date( seconds * 1000 ) );
}

export function pageUrl( view, params = {} ) {
	const url = new URL( config.pages?.[ view ] || window.location.href );
	Object.entries( params ).forEach( ( [ k, v ] ) => url.searchParams.set( k, v ) );
	return url.toString();
}

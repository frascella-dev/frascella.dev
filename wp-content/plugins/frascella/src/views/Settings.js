/**
 * Settings, laid out like the owner's other plugins: sections on the side, one Save.
 * The business's facts — what the footer, the structured data, the contact form's
 * recipient and the dynamic tags read. Never invented: an empty field is an absent fact.
 */
import { useEffect, useState } from '@wordpress/element';
import { Button, Notice, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import { api, errorMessage } from '../api';
import { Card, Header, Loading } from '../components';

const common = { __nextHasNoMarginBottom: true, __next40pxDefaultSize: true };
const sectionList = () => [
	[ 'business', __( 'The business', 'frascella' ), [ 'name', 'vat' ], __( 'Who the site belongs to. The footer, the privacy notice and the search engines’ data read them from here.', 'frascella' ) ],
	[ 'place', __( 'Where', 'frascella' ), [ 'street', 'postcode', 'city', 'region', 'country' ], __( 'Only what you want on the site: an empty field is left out everywhere.', 'frascella' ) ],
	[ 'contact', __( 'Contact', 'frascella' ), [ 'email', 'phone' ], __( 'The email receives the contact form’s requests.', 'frascella' ) ],
	[ 'elsewhere', __( 'Elsewhere', 'frascella' ), [ 'github', 'linkedin' ], __( 'The profiles the footer links to. https addresses only.', 'frascella' ) ],
];

export default function Settings() {
	const [ section, setSection ] = useState( window.location.hash.slice( 1 ) || 'business' );
	const [ data, setData ] = useState( null );
	const [ draft, setDraft ] = useState( null );
	const [ notice, setNotice ] = useState( null );
	const [ busy, setBusy ] = useState( false );
	const take = ( res ) => {
		setData( res );
		setDraft( { ...res.settings } );
	};
	useEffect( () => {
		api( '/settings' ).then( take, ( e ) => setNotice( { status: 'error', text: errorMessage( e ) } ) );
	}, [] );
	useEffect( () => {
		window.history.replaceState( {}, '', `#${ section }` );
	}, [ section ] );
	const dirty = !! data && JSON.stringify( data.settings ) !== JSON.stringify( draft );
	const save = async () => {
		setBusy( true );
		try {
			take( await api( '/settings', { method: 'POST', data: draft } ) );
			setNotice( { status: 'success', text: __( 'Settings saved.', 'frascella' ) } );
		} catch ( e ) {
			setNotice( { status: 'error', text: errorMessage( e ) } );
		}
		setBusy( false );
	};
	if ( ! draft ) {
		return (
			<div className="frascella-app">
				<Header view="settings" title={ __( 'Settings', 'frascella' ) } />
				{ notice ? <Notice status="error" isDismissible={ false }>{ notice.text }</Notice> : <Loading /> }
			</div>
		);
	}
	const fields = Object.fromEntries( data.fields.map( ( f ) => [ f.key, f ] ) );
	const [ , label, keys, help ] = sectionList().find( ( [ key ] ) => key === section ) || sectionList()[ 0 ];

	return (
		<div className="frascella-app">
			<Header view="settings" title={ __( 'Settings', 'frascella' ) } actions={ <Button variant="primary" onClick={ save } isBusy={ busy } disabled={ busy || ! dirty }>{ dirty ? __( 'Save changes', 'frascella' ) : __( 'Saved', 'frascella' ) }</Button> } />
			{ notice && <Notice status={ notice.status } onRemove={ () => setNotice( null ) } className="frascella-notice">{ notice.text }</Notice> }
			<div className="frascella-settings">
				<nav className="frascella-side" aria-label={ __( 'Settings sections', 'frascella' ) }>
					{ sectionList().map( ( [ key, name ] ) => (
						<button key={ key } type="button" className={ 'frascella-side__item' + ( section === key ? ' is-active' : '' ) } aria-current={ section === key ? 'true' : undefined } onClick={ () => setSection( key ) }>{ name }</button>
					) ) }
				</nav>
				<div className="frascella-settings__main">
					<Card title={ label } subtitle={ help }>
						<div className="frascella-fields">
							{ keys.filter( ( k ) => fields[ k ] ).map( ( k ) => (
								<TextControl
									key={ k }
									{ ...common }
									type={ fields[ k ].type }
									label={ fields[ k ].label }
									value={ draft[ k ] || '' }
									onChange={ ( v ) => setDraft( ( d ) => ( { ...d, [ k ]: v } ) ) }
								/>
							) ) }
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}

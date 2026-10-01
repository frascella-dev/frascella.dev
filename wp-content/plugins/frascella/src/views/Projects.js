/**
 * Projects: the list in the order the home page shows them, with their languages; and the
 * editor — one tab per language for the words, the address, the screenshot and the place
 * shared by every language. Laid out like Chiaro's questions.
 */
import { useEffect, useState } from '@wordpress/element';
import { Button, Notice, TextControl, TextareaControl } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

import { api, config, errorMessage, formatDate } from '../api';
import { Card, Empty, Header, LangPills, Loading, StatusBadge, statusGroupLabels } from '../components';

const params = new URLSearchParams( window.location.search );
const languages = config.languages || [];
const main = config.mainLanguage || languages[ 0 ];
const common = { __nextHasNoMarginBottom: true, __next40pxDefaultSize: true };

export default function Projects() {
	const [ open, setOpen ] = useState( params.get( 'project' ) || ( params.get( 'new' ) ? 'new' : '' ) );
	const go = ( tgroup ) => {
		const url = new URL( window.location.href );
		[ 'project', 'new', 'lang' ].forEach( ( k ) => url.searchParams.delete( k ) );
		if ( tgroup ) {
			url.searchParams.set( tgroup === 'new' ? 'new' : 'project', tgroup === 'new' ? '1' : tgroup );
		}
		window.history.replaceState( null, '', url );
		setOpen( tgroup );
	};
	return open ? <Editor tgroup={ open === 'new' ? '' : open } onBack={ () => go( '' ) } onCreated={ go } /> : <List onOpen={ go } />;
}

/* The list ------------------------------------------------------------------------------ */

function List( { onOpen } ) {
	const [ status, setStatus ] = useState( '' );
	const [ q, setQ ] = useState( '' );
	const [ data, setData ] = useState( null );
	const [ error, setError ] = useState( '' );
	const [ reload, setReload ] = useState( 0 );
	const [ dragging, setDragging ] = useState( null );

	useEffect( () => {
		const t = setTimeout( () => api( addQueryArgs( '/projects', { status, q } ) ).then( setData, ( e ) => setError( errorMessage( e ) ) ), q ? 250 : 0 );
		return () => clearTimeout( t );
	}, [ status, q, reload ] );

	const filtered = status !== '' || q !== '';
	const move = async ( from, to ) => {
		if ( to < 0 || to >= data.items.length || from === to || from === null ) {
			return;
		}
		const items = [ ...data.items ];
		const [ it ] = items.splice( from, 1 );
		items.splice( to, 0, it );
		setData( { ...data, items } );
		try {
			await api( '/projects/order', { method: 'POST', data: { tgroups: items.map( ( i ) => i.tgroup ) } } );
		} catch ( e ) {
			setError( errorMessage( e ) );
			setReload( ( x ) => x + 1 );
		}
	};

	return (
		<div className="frascella-app">
			<Header view="projects" title={ __( 'Projects', 'frascella' ) } actions={ <Button variant="primary" onClick={ () => onOpen( 'new' ) }>{ __( 'New project', 'frascella' ) }</Button> } />
			{ error && <Notice status="error" onRemove={ () => setError( '' ) }>{ error }</Notice> }
			<div className="frascella-toolbar">
				<div className="frascella-filters" role="tablist" aria-label={ __( 'Status', 'frascella' ) }>
					{ [ '', 'published', 'draft' ].map( ( key ) => (
						<button key={ key || 'all' } type="button" role="tab" aria-selected={ status === key } className={ 'frascella-filter' + ( status === key ? ' is-active' : '' ) } onClick={ () => setStatus( key ) }>
							{ key ? statusGroupLabels()[ key ] : __( 'All', 'frascella' ) }
							{ key && data?.counts?.[ key ] ? <span className="frascella-filter__count">{ data.counts[ key ] }</span> : null }
						</button>
					) ) }
				</div>
				<div className="frascella-toolbar__side">
					<TextControl { ...common } type="search" label={ __( 'Search', 'frascella' ) } hideLabelFromVision placeholder={ __( 'Search…', 'frascella' ) } value={ q } onChange={ setQ } />
				</div>
			</div>
			{ ! data && ! error && <Loading /> }
			{ data && (
				<Card flush>
					{ data.items.length === 0 ? (
						<Empty title={ filtered ? __( 'Nothing here', 'frascella' ) : __( 'No projects yet', 'frascella' ) } action={ ! filtered && <Button variant="secondary" onClick={ () => onOpen( 'new' ) }>{ __( 'Add the first one', 'frascella' ) }</Button> }>
							{ ! filtered && __( 'Each project is a card on the home page: its name, your role, a few lines, the stack and a screenshot.', 'frascella' ) }
						</Empty>
					) : (
						<table className="frascella-table frascella-table--projects">
							<thead>
								<tr>
									<th className="is-order"><span className="screen-reader-text">{ __( 'Order', 'frascella' ) }</span></th>
									<th>{ __( 'Project', 'frascella' ) }</th>
									{ languages.length > 1 && <th>{ __( 'Languages', 'frascella' ) }</th> }
									<th>{ __( 'Changed', 'frascella' ) }</th>
									<th>{ __( 'Status', 'frascella' ) }</th>
								</tr>
							</thead>
							<tbody>
								{ data.items.map( ( item, i ) => (
									<tr
										key={ item.tgroup }
										draggable={ ! filtered }
										className={ dragging === i ? 'is-dragging' : '' }
										onDragStart={ () => setDragging( i ) }
										onDragOver={ ( e ) => e.preventDefault() }
										onDrop={ () => { move( dragging, i ); setDragging( null ); } }
										onDragEnd={ () => setDragging( null ) }
									>
										<td className="is-order">
											{ ! filtered && (
												<span className="frascella-order">
													<Button size="small" icon="arrow-up-alt2" label={ sprintf( /* translators: %s: project name. */ __( 'Move %s up', 'frascella' ), item.title ) } disabled={ i === 0 } onClick={ () => move( i, i - 1 ) } />
													<Button size="small" icon="arrow-down-alt2" label={ sprintf( /* translators: %s: project name. */ __( 'Move %s down', 'frascella' ), item.title ) } disabled={ i === data.items.length - 1 } onClick={ () => move( i, i + 1 ) } />
												</span>
											) }
										</td>
										<td>
											<div className="frascella-project-cell">
												{ item.image ? <img className="frascella-thumb" src={ item.image.url } alt="" width="64" height="40" /> : <span className="frascella-thumb is-empty" aria-hidden="true" /> }
												<div>
													<button type="button" className="frascella-table__primary frascella-link" onClick={ () => onOpen( item.tgroup ) }>{ item.title }</button>
													<span className="frascella-table__secondary">{ [ item.role, item.state ].filter( Boolean ).join( ' · ' ) }</span>
												</div>
											</div>
										</td>
										{ languages.length > 1 && <td><LangPills languages={ languages } have={ item.languages } /></td> }
										<td className="frascella-muted">{ formatDate( item.updated_at ) }</td>
										<td><StatusBadge status={ item.status } /></td>
									</tr>
								) ) }
							</tbody>
						</table>
					) }
				</Card>
			) }
			{ ! filtered && data?.items.length > 1 && <p className="frascella-hint">{ __( 'Drag a row, or use the arrows, to change the order of the cards on the home page: every language follows.', 'frascella' ) }</p> }
		</div>
	);
}

/* The screenshot ------------------------------------------------------------------------ */

function Screenshot( { image, onChange } ) {
	const choose = () => {
		const frame = window.wp?.media?.( {
			title: __( 'The project’s screenshot', 'frascella' ),
			button: { text: __( 'Use this image', 'frascella' ) },
			library: { type: 'image' },
			multiple: false,
		} );
		if ( ! frame ) {
			return;
		}
		frame.on( 'select', () => {
			const a = frame.state().get( 'selection' ).first().toJSON();
			onChange( { id: a.id, url: a.sizes?.medium?.url || a.url, alt: a.alt || '' } );
		} );
		frame.open();
	};
	return (
		<div className="frascella-shot">
			{ image ? <img src={ image.url } alt={ image.alt } /> : <div className="frascella-shot__empty">{ __( 'No screenshot', 'frascella' ) }</div> }
			<div className="frascella-shot__actions">
				<Button variant="secondary" onClick={ choose }>{ image ? __( 'Replace', 'frascella' ) : __( 'Choose an image', 'frascella' ) }</Button>
				{ image && <Button variant="link" isDestructive onClick={ () => onChange( null ) }>{ __( 'Remove', 'frascella' ) }</Button> }
			</div>
			<p className="frascella-muted">{ __( '1440 × 900. The desk shows it on the laptop’s screen. Its alternative text is the media library’s, in each language.', 'frascella' ) }</p>
		</div>
	);
}

/* The editor ---------------------------------------------------------------------------- */

const blank = ( lang ) => ( { forLang: lang, title: '', role: '', body: '', stack: '', state: '', status: 'draft' } );

function Editor( { tgroup, onBack, onCreated } ) {
	const [ data, setData ] = useState( tgroup ? null : { languages: {}, image: null } );
	const [ lang, setLang ] = useState( params.get( 'lang' ) || main );
	const [ draft, setDraft ] = useState( null );
	const [ shared, setShared ] = useState( { url: '', image: null } );
	const [ errors, setErrors ] = useState( {} );
	const [ error, setError ] = useState( '' );
	const [ notice, setNotice ] = useState( '' );
	const [ busy, setBusy ] = useState( false );
	const [ reload, setReload ] = useState( 0 );

	useEffect( () => {
		if ( tgroup ) {
			api( `/projects/${ tgroup }` ).then( ( r ) => {
				setData( r );
				const any = Object.values( r.languages )[ 0 ];
				setShared( { url: any?.url || '', image: r.image } );
			}, ( e ) => setError( errorMessage( e ) ) );
		}
	}, [ tgroup, reload ] );

	const current = data?.languages?.[ lang ];
	const original = data?.languages?.[ main ] || Object.values( data?.languages || {} )[ 0 ];
	useEffect( () => {
		if ( data ) {
			setDraft( current ? { ...current, forLang: lang } : blank( lang ) );
			setErrors( {} );
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ data, lang ] );

	const set = ( patch ) => setDraft( { ...draft, ...patch } );
	const save = async ( status ) => {
		setBusy( true );
		setError( '' );
		setErrors( {} );
		const body = { title: draft.title, role: draft.role, body: draft.body, stack: draft.stack, state: draft.state, url: shared.url, image_id: shared.image?.id || 0, status: status || draft.status };
		try {
			if ( current ) {
				await api( `/projects/${ current.id }`, { method: 'PATCH', data: body } );
				setNotice( __( 'Saved.', 'frascella' ) );
				setReload( ( x ) => x + 1 );
			} else {
				const res = await api( '/projects', { method: 'POST', data: { ...body, lang, translation_of: tgroup || undefined } } );
				setNotice( __( 'Saved.', 'frascella' ) );
				if ( ! tgroup ) {
					onCreated( res.tgroup );
				} else {
					setReload( ( x ) => x + 1 );
				}
			}
		} catch ( e ) {
			setError( errorMessage( e ) );
			setErrors( e?.errors || {} );
		}
		setBusy( false );
	};
	const remove = async ( all ) => {
		// eslint-disable-next-line no-alert
		if ( ! window.confirm( all ? __( 'Delete this project in every language?', 'frascella' ) : __( 'Delete this language of the project?', 'frascella' ) ) ) {
			return;
		}
		await api( addQueryArgs( `/projects/${ current.id }`, all ? { all: 1 } : {} ), { method: 'DELETE' } );
		if ( all || Object.keys( data.languages ).length === 1 ) {
			onBack();
		} else {
			setLang( main );
			setReload( ( x ) => x + 1 );
		}
	};

	const title = tgroup ? original?.title || __( 'Project', 'frascella' ) : __( 'New project', 'frascella' );
	return (
		<div className="frascella-app">
			<Header view="projects" title={ title } actions={ <Button variant="tertiary" onClick={ onBack }>{ __( '← All projects', 'frascella' ) }</Button> } />
			{ error && <Notice status="error" onRemove={ () => setError( '' ) }>{ error }</Notice> }
			{ notice && <Notice status="success" onRemove={ () => setNotice( '' ) } className="frascella-notice">{ notice }</Notice> }
			{ ( ! data || ! draft ) && ! error && <Loading /> }
			{ data && draft && draft.forLang === lang && (
				<div className="frascella-detail">
					<div className="frascella-detail__main">
						{ languages.length > 1 && (
							<div className="frascella-filters frascella-lang-tabs" role="tablist" aria-label={ __( 'Languages', 'frascella' ) }>
								{ languages.map( ( l ) => {
									const has = data.languages[ l ];
									return (
										<button key={ l } type="button" role="tab" aria-selected={ lang === l } className={ 'frascella-filter' + ( lang === l ? ' is-active' : '' ) } onClick={ () => setLang( l ) } disabled={ ! tgroup && l !== lang }>
											{ l.toUpperCase() }
											<span className="frascella-filter__count">{ has ? ( has.status === 'published' ? __( 'published', 'frascella' ) : __( 'draft', 'frascella' ) ) : __( 'to translate', 'frascella' ) }</span>
										</button>
									);
								} ) }
							</div>
						) }
						<Card>
							{ ! current && tgroup && original && (
								<div className="frascella-translate-from">
									<p className="frascella-muted">{ sprintf( /* translators: %s: language code. */ __( 'Translating from %s:', 'frascella' ), original.lang.toUpperCase() ) }</p>
									<p><strong>{ original.title }</strong> · { original.role }</p>
									<p>{ original.body }</p>
								</div>
							) }
							<div className="frascella-fields">
								<div className="frascella-fields--grid">
									<TextControl { ...common } label={ __( 'Name', 'frascella' ) } value={ draft.title } onChange={ ( v ) => set( { title: v } ) } maxLength={ 200 } help={ errors.title } className={ errors.title ? 'has-error' : '' } />
									<TextControl { ...common } label={ __( 'Role', 'frascella' ) } value={ draft.role } onChange={ ( v ) => set( { role: v } ) } maxLength={ 120 } help={ __( 'Yours in the project: client, co-founder, personal.', 'frascella' ) } />
								</div>
								<TextareaControl __nextHasNoMarginBottom label={ __( 'Text', 'frascella' ) } value={ draft.body } onChange={ ( v ) => set( { body: v } ) } rows={ 5 } help={ __( 'A few lines: what it is, and what you did.', 'frascella' ) } />
								<div className="frascella-fields--grid">
									<TextControl { ...common } label={ __( 'Stack', 'frascella' ) } value={ draft.stack } onChange={ ( v ) => set( { stack: v } ) } maxLength={ 200 } help={ __( 'Leave it empty for a proprietary project: the card then has no stack line.', 'frascella' ) } />
									<TextControl { ...common } label={ __( 'State', 'frascella' ) } value={ draft.state } onChange={ ( v ) => set( { state: v } ) } maxLength={ 120 } help={ __( 'Live, in development, public on GitHub…', 'frascella' ) } />
								</div>
							</div>
						</Card>
						<div className="frascella-editor-actions">
							<Button variant="primary" isBusy={ busy } disabled={ busy } onClick={ () => save( 'published' ) }>{ draft.status === 'published' && current ? __( 'Save', 'frascella' ) : __( 'Publish', 'frascella' ) }</Button>
							{ ( ! current || draft.status !== 'published' ) && <Button variant="secondary" disabled={ busy } onClick={ () => save( 'draft' ) }>{ __( 'Save as draft', 'frascella' ) }</Button> }
							{ current && draft.status === 'published' && <Button variant="secondary" disabled={ busy } onClick={ () => save( 'draft' ) }>{ __( 'Unpublish', 'frascella' ) }</Button> }
						</div>
					</div>
					<aside className="frascella-detail__side">
						<Card title={ __( 'In every language', 'frascella' ) } subtitle={ languages.length > 1 ? __( 'The address and the screenshot are the same for every language.', 'frascella' ) : undefined }>
							<div className="frascella-fields">
								<TextControl { ...common } type="url" label={ __( 'Address', 'frascella' ) } placeholder="https://" value={ shared.url } onChange={ ( url ) => setShared( { ...shared, url } ) } help={ errors.url || __( 'Optional. The project’s name links to it.', 'frascella' ) } className={ errors.url ? 'has-error' : '' } />
								<Screenshot image={ shared.image } onChange={ ( image ) => setShared( { ...shared, image } ) } />
							</div>
						</Card>
						{ current && (
							<Card title={ __( 'This language', 'frascella' ) }>
								<p className="frascella-meta-row"><span className="frascella-muted">{ __( 'Status', 'frascella' ) }</span> <StatusBadge status={ current.status } /></p>
								<p className="frascella-meta-row"><span className="frascella-muted">{ __( 'Changed', 'frascella' ) }</span> <span>{ formatDate( current.updated_at ) }</span></p>
								{ current.status === 'published' && config.home && <p><a href={ config.home } target="_blank" rel="noreferrer">{ __( 'See it on the home page', 'frascella' ) }</a></p> }
							</Card>
						) }
						{ current && (
							<div className="frascella-danger">
								{ Object.keys( data.languages ).length > 1 && <Button variant="link" isDestructive onClick={ () => remove( false ) }>{ sprintf( /* translators: %s: language code. */ __( 'Delete the %s version', 'frascella' ), lang.toUpperCase() ) }</Button> }
								<Button variant="link" isDestructive onClick={ () => remove( true ) }>{ languages.length > 1 ? __( 'Delete in every language', 'frascella' ) : __( 'Delete', 'frascella' ) }</Button>
							</div>
						) }
					</aside>
				</div>
			) }
		</div>
	);
}

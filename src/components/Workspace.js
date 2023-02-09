import styles from './Workspace.module.css'
import Card from './Card';
import { useState } from 'react';

const prev_notes = JSON.parse(localStorage.getItem('saved_notes')) || [];

console.log(prev_notes)

function handleClick(props){
    let new_text = document.getElementById('textbox').innerHTML;
    if(new_text==='') return;
    const newlist = [...props.notes,{text:new_text}];
    props.addNote(newlist);
    localStorage.setItem('saved_notes',JSON.stringify(newlist));
    new_text='';
}

function NewNoteBar(props){
    return(
        <div className={styles.newnote_container}>
            <div id='textbox' className={styles.textbox} placeholder='Make a note...'  contentEditable='true'></div>
            <button className={styles.create} onClick={()=>handleClick(props)}>▶</button>
        </div>
    );
}

export default function Workspace(){

    const [notes,addNote] = useState(prev_notes);

    console.log(notes);

    return(
        <div className={styles.container}>
            <div className={styles.topchild}>
                <NewNoteBar notes={notes} addNote={addNote} />
            </div>
            <div className={styles.bottomchild}>
               {notes.map(note => <Card card_obj={note}/>)}
            </div>
        </div>
    );
}
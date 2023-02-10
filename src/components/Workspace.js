import styles from './Workspace.module.css'
import Card from './Card';
import { useState } from 'react';

const prev_notes = JSON.parse(localStorage.getItem('saved_notes')) || [];

function handleClick(props){
    let new_text = document.getElementById('textbox').innerText;
    if(new_text==='') return;
    const newlist = [{text:new_text},...props.notes];
    props.addNote(newlist);
    localStorage.setItem('saved_notes',JSON.stringify(newlist));
    document.getElementById('textbox').innerText = '';
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

    const [notes,setNotes] = useState(prev_notes);

    return(
        <div className={styles.container}>
            <div className={styles.topchild}>
                <NewNoteBar notes={notes} addNote={setNotes} />
            </div>
            <div className={styles.bottomchild}>
               {notes.map((note,i) => <Card key={crypto.randomUUID()} index={i} notes={notes} card_obj={note} setNotes={setNotes}/>)}
            </div>
        </div>
    );
}
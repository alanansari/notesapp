import styles from './Workspace.module.css'
import Card from './Card';
import { useState } from 'react';

const prev_notes = [{text:'hello this is the first note to be displayed.'},
{text:'second note to be displayed is this'}];

function handleClick(props){
    let new_text = document.getElementById('textbox').innerHTML;
    if(new_text==='') return;
    const newlist = props.notes;
    console.log(newlist);
    props.addNote([...newlist,{text:new_text}]);
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
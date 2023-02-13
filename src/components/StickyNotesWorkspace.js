import styles from './StickyNotesWorkspace.module.css'
import Card from './Card';
import { useState } from 'react';
import NewContentBar from './AddContentBar';

export default function Workspace(){

    const [notes,setNotes] = useState(JSON.parse(localStorage.getItem('saved_notes')) || []);

    return(
        <div className={styles.container}>
            <div className={styles.topchild}>
                <NewContentBar msg='Make a note...' notes={notes} addNote={setNotes} type='note'/>
            </div>
            <div className={styles.bottomchild}>
                <div className={styles.row}>
                    {notes.map((note,i) => {
                            if(i%3===0)
                            return <Card key={crypto.randomUUID()} index={i} notes={notes} card_obj={note} setNotes={setNotes}/>
                            else
                            return <></>;
                        })}
                </div>
                <div className={styles.row}>
                    {notes.map((note,i) => {
                            if(i%3===1)
                            return <Card key={crypto.randomUUID()} index={i} notes={notes} card_obj={note} setNotes={setNotes}/>
                            else
                            return <></>;
                        })}
                </div>
                <div className={styles.row}>
                    {notes.map((note,i) => {
                            if(i%3===2)
                            return <Card key={crypto.randomUUID()} index={i} notes={notes} card_obj={note} setNotes={setNotes}/>
                            else
                            return <></>;
                        })}
                </div>
            </div>
        </div>
    );
}
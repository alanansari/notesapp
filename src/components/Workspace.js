import styles from './Workspace.module.css'

function NewNoteBar(){
    return(
        <div className={styles.newnote_container}>
            <div className={styles.textbox} placeholder='Make a note...' role='textbox' contentEditable='true'></div>
            <button onhover='box("hello")' className={styles.create}>▶</button>
        </div>
    );
}

export default function Workspace(){
    return(
        <div className={styles.container}>
            <div className={styles.topchild}>
                <NewNoteBar />
            </div>
        </div>
    );
}
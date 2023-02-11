import styles from './Navbar.module.css'
import NavButton from './NavButton';

export default function Navbar(){
    return (
        <div className={styles.container}>
            <h1 className={styles.heading}>Noted</h1>
            <NavButton type='Sticky Notes' link='/notesapp'/>
            <NavButton type='Tasks' link='/notesapp/tasks' />
        </div>
    );
}
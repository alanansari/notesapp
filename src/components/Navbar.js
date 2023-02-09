import styles from './Navbar.module.css'

function Button() {
    return(
        <div className={styles.btn_box}>
            <button className={styles.btn}>Sticky Notes</button>
        </div>
    );
}

export default function Navbar(){
    return (
        <div className={styles.container}>
            <h1 className={styles.heading}>Notes</h1>
            <Button/>
        </div>
    );
}
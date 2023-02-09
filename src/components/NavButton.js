import styles from './NavButton.module.css'

export default function NavButton({type}) {
    return(
        <div className={styles.btn_box}>
            <button className={styles.btn}>{type}</button>
        </div>
    );
}

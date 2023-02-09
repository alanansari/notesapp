import styles from './Navbar.module.css'

export default function Navbar({heading}){
    return (
        <div className={styles.container}>
            {heading}
        </div>
    );
}